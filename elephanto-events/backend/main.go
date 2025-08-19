package main

import (
	"elephanto-events/config"
	"elephanto-events/db"
	"elephanto-events/handlers"
	"elephanto-events/middleware"
	"elephanto-events/services"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "migrate":
			runMigrations()
			return
		case "serve":
			serve()
			return
		default:
			log.Fatalf("Unknown command: %s", os.Args[1])
		}
	}

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := config.Load()

	database, err := db.NewConnection(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	if cfg.AutoMigrate {
		log.Println("Running auto-migrations...")
		if err := db.RunMigrations(database.DB, "./db/migrations"); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
	}

	emailService := services.NewEmailService(
		cfg.EmailService,
		cfg.BrevoAPIKey,
		cfg.SMTPHost,
		cfg.SMTPPort,
		cfg.FrontendURL,
		cfg.EmailServiceOverride,
	)

	authService := services.NewAuthService(database.DB, emailService, cfg.JWTSecret)
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(database.DB)
	adminHandler := handlers.NewAdminHandler(database.DB)
	cocktailHandler := handlers.NewCocktailPreferenceHandler(database.DB)
	surveyHandler := handlers.NewSurveyResponseHandler(database.DB)
	eventHandler := handlers.NewEventHandler(database.DB)
	eventDetailHandler := handlers.NewEventDetailHandler(database.DB)
	eventFAQHandler := handlers.NewEventFAQHandler(database.DB)

	r := mux.NewRouter()

	r.Use(middleware.CORS(cfg.FrontendURL))
	
	// Handle all OPTIONS requests for CORS preflight
	r.Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	api := r.PathPrefix("/api").Subrouter()
	
	// Handle OPTIONS for all API routes
	api.Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")

	auth := api.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/request-login", authHandler.RequestLogin).Methods("POST", "OPTIONS")
	auth.HandleFunc("/verify", authHandler.VerifyToken).Methods("GET")

	protected := api.PathPrefix("").Subrouter()
	protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	
	protected.HandleFunc("/auth/me", authHandler.GetMe).Methods("GET")
	protected.HandleFunc("/auth/logout", authHandler.Logout).Methods("POST")
	protected.HandleFunc("/users/profile", userHandler.UpdateProfile).Methods("PUT")
	protected.HandleFunc("/cocktail-preference", cocktailHandler.GetPreference).Methods("GET")
	protected.HandleFunc("/cocktail-preference", cocktailHandler.SavePreference).Methods("POST")
	protected.HandleFunc("/survey-response", surveyHandler.GetSurveyResponse).Methods("GET")
	protected.HandleFunc("/survey-response", surveyHandler.CreateSurveyResponse).Methods("POST")
	
	// Event attendance endpoints (requires auth)
	protected.HandleFunc("/events/attendance", eventHandler.GetUserAttendance).Methods("GET")
	protected.HandleFunc("/events/attendance", eventHandler.UpdateUserAttendance).Methods("POST")

	// Public event endpoints (no auth required)
	api.HandleFunc("/events/active", eventHandler.GetActiveEvent).Methods("GET")

	admin := protected.PathPrefix("/admin").Subrouter()
	admin.Use(middleware.AdminMiddleware)
	
	// User management
	admin.HandleFunc("/users", adminHandler.GetUsers).Methods("GET")
	admin.HandleFunc("/users", adminHandler.CreateUser).Methods("POST")
	admin.HandleFunc("/users/{id}", adminHandler.GetUserWithDetails).Methods("GET")
	admin.HandleFunc("/users/{id}", adminHandler.UpdateUserFull).Methods("PUT")
	admin.HandleFunc("/users/{id}/role", adminHandler.UpdateUserRole).Methods("PUT")
	admin.HandleFunc("/users/{id}/attendance", adminHandler.UpdateUserAttendance).Methods("PUT")
	admin.HandleFunc("/users/{id}/survey", adminHandler.UpdateUserSurvey).Methods("PUT")
	admin.HandleFunc("/users/{id}/cocktail", adminHandler.UpdateUserCocktail).Methods("PUT")
	
	// Event management
	admin.HandleFunc("/events", eventHandler.GetEvents).Methods("GET")
	admin.HandleFunc("/events", eventHandler.CreateEvent).Methods("POST")
	admin.HandleFunc("/events/{id}", eventHandler.GetEvent).Methods("GET")
	admin.HandleFunc("/events/{id}", eventHandler.UpdateEvent).Methods("PUT")
	admin.HandleFunc("/events/{id}", eventHandler.DeleteEvent).Methods("DELETE")
	admin.HandleFunc("/events/{id}/activate", eventHandler.ActivateEvent).Methods("PUT")
	admin.HandleFunc("/events/{id}/attendance", eventHandler.GetEventAttendanceStats).Methods("GET")
	
	// Event details management
	admin.HandleFunc("/events/{eventId}/details", eventDetailHandler.CreateEventDetail).Methods("POST")
	admin.HandleFunc("/events/{eventId}/details/{detailId}", eventDetailHandler.UpdateEventDetail).Methods("PUT")
	admin.HandleFunc("/events/{eventId}/details/{detailId}", eventDetailHandler.DeleteEventDetail).Methods("DELETE")
	
	// Event FAQ management
	admin.HandleFunc("/events/{eventId}/faqs", eventFAQHandler.CreateEventFAQ).Methods("POST")
	admin.HandleFunc("/events/{eventId}/faqs/{faqId}", eventFAQHandler.UpdateEventFAQ).Methods("PUT")
	admin.HandleFunc("/events/{eventId}/faqs/{faqId}", eventFAQHandler.DeleteEventFAQ).Methods("DELETE")
	
	// System
	admin.HandleFunc("/migrations", adminHandler.GetMigrationStatus).Methods("GET")

	// Add catch-all for unmatched routes (including OPTIONS)
	r.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		http.NotFound(w, r)
	})

	log.Printf("Server starting on port %s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}

func runMigrations() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := config.Load()

	database, err := db.NewConnection(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	command := "up"
	if len(os.Args) > 2 {
		command = os.Args[2]
	}

	switch command {
	case "up":
		if err := db.RunMigrations(database.DB, "./db/migrations"); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
		log.Println("Migrations completed successfully")
	case "status":
		version, dirty, err := db.GetMigrationStatus(database.DB, "./db/migrations")
		if err != nil {
			log.Fatalf("Failed to get migration status: %v", err)
		}
		fmt.Printf("Migration version: %d, dirty: %t\n", version, dirty)
	default:
		log.Fatalf("Unknown migration command: %s", command)
	}
}

func serve() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := config.Load()

	database, err := db.NewConnection(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	if cfg.AutoMigrate {
		log.Println("Running auto-migrations...")
		if err := db.RunMigrations(database.DB, "./db/migrations"); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
	}

	emailService := services.NewEmailService(
		cfg.EmailService,
		cfg.BrevoAPIKey,
		cfg.SMTPHost,
		cfg.SMTPPort,
		cfg.FrontendURL,
		cfg.EmailServiceOverride,
	)

	authService := services.NewAuthService(database.DB, emailService, cfg.JWTSecret)
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(database.DB)
	adminHandler := handlers.NewAdminHandler(database.DB)
	cocktailHandler := handlers.NewCocktailPreferenceHandler(database.DB)
	surveyHandler := handlers.NewSurveyResponseHandler(database.DB)
	eventHandler := handlers.NewEventHandler(database.DB)
	eventDetailHandler := handlers.NewEventDetailHandler(database.DB)
	eventFAQHandler := handlers.NewEventFAQHandler(database.DB)

	r := mux.NewRouter()

	r.Use(middleware.CORS(cfg.FrontendURL))
	
	// Handle all OPTIONS requests for CORS preflight
	r.Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	api := r.PathPrefix("/api").Subrouter()
	
	// Handle OPTIONS for all API routes
	api.Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")

	auth := api.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/request-login", authHandler.RequestLogin).Methods("POST", "OPTIONS")
	auth.HandleFunc("/verify", authHandler.VerifyToken).Methods("GET")

	protected := api.PathPrefix("").Subrouter()
	protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	
	protected.HandleFunc("/auth/me", authHandler.GetMe).Methods("GET")
	protected.HandleFunc("/auth/logout", authHandler.Logout).Methods("POST")
	protected.HandleFunc("/users/profile", userHandler.UpdateProfile).Methods("PUT")
	protected.HandleFunc("/cocktail-preference", cocktailHandler.GetPreference).Methods("GET")
	protected.HandleFunc("/cocktail-preference", cocktailHandler.SavePreference).Methods("POST")
	protected.HandleFunc("/survey-response", surveyHandler.GetSurveyResponse).Methods("GET")
	protected.HandleFunc("/survey-response", surveyHandler.CreateSurveyResponse).Methods("POST")
	
	// Event attendance endpoints (requires auth)
	protected.HandleFunc("/events/attendance", eventHandler.GetUserAttendance).Methods("GET")
	protected.HandleFunc("/events/attendance", eventHandler.UpdateUserAttendance).Methods("POST")

	// Public event endpoints (no auth required)
	api.HandleFunc("/events/active", eventHandler.GetActiveEvent).Methods("GET")

	admin := protected.PathPrefix("/admin").Subrouter()
	admin.Use(middleware.AdminMiddleware)
	
	// User management
	admin.HandleFunc("/users", adminHandler.GetUsers).Methods("GET")
	admin.HandleFunc("/users", adminHandler.CreateUser).Methods("POST")
	admin.HandleFunc("/users/{id}", adminHandler.GetUserWithDetails).Methods("GET")
	admin.HandleFunc("/users/{id}", adminHandler.UpdateUserFull).Methods("PUT")
	admin.HandleFunc("/users/{id}/role", adminHandler.UpdateUserRole).Methods("PUT")
	admin.HandleFunc("/users/{id}/attendance", adminHandler.UpdateUserAttendance).Methods("PUT")
	admin.HandleFunc("/users/{id}/survey", adminHandler.UpdateUserSurvey).Methods("PUT")
	admin.HandleFunc("/users/{id}/cocktail", adminHandler.UpdateUserCocktail).Methods("PUT")
	
	// Event management
	admin.HandleFunc("/events", eventHandler.GetEvents).Methods("GET")
	admin.HandleFunc("/events", eventHandler.CreateEvent).Methods("POST")
	admin.HandleFunc("/events/{id}", eventHandler.GetEvent).Methods("GET")
	admin.HandleFunc("/events/{id}", eventHandler.UpdateEvent).Methods("PUT")
	admin.HandleFunc("/events/{id}", eventHandler.DeleteEvent).Methods("DELETE")
	admin.HandleFunc("/events/{id}/activate", eventHandler.ActivateEvent).Methods("PUT")
	admin.HandleFunc("/events/{id}/attendance", eventHandler.GetEventAttendanceStats).Methods("GET")
	
	// Event details management
	admin.HandleFunc("/events/{eventId}/details", eventDetailHandler.CreateEventDetail).Methods("POST")
	admin.HandleFunc("/events/{eventId}/details/{detailId}", eventDetailHandler.UpdateEventDetail).Methods("PUT")
	admin.HandleFunc("/events/{eventId}/details/{detailId}", eventDetailHandler.DeleteEventDetail).Methods("DELETE")
	
	// Event FAQ management
	admin.HandleFunc("/events/{eventId}/faqs", eventFAQHandler.CreateEventFAQ).Methods("POST")
	admin.HandleFunc("/events/{eventId}/faqs/{faqId}", eventFAQHandler.UpdateEventFAQ).Methods("PUT")
	admin.HandleFunc("/events/{eventId}/faqs/{faqId}", eventFAQHandler.DeleteEventFAQ).Methods("DELETE")
	
	// System
	admin.HandleFunc("/migrations", adminHandler.GetMigrationStatus).Methods("GET")

	// Add catch-all for unmatched routes (including OPTIONS)
	r.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		http.NotFound(w, r)
	})

	log.Printf("Server starting on port %s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}