package config

import (
	"log"
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL            string
	JWTSecret              string
	EmailService           string
	BrevoAPIKey            string
	SMTPHost               string
	SMTPPort               int
	FrontendURL            string
	Port                   string
	AutoMigrate            bool
	EmailServiceOverride   bool
}

func Load() *Config {
	smtpPort, err := strconv.Atoi(getEnv("SMTP_PORT", "1025"))
	if err != nil {
		log.Printf("Invalid SMTP_PORT, using default 1025: %v", err)
		smtpPort = 1025
	}

	autoMigrate, err := strconv.ParseBool(getEnv("AUTO_MIGRATE", "true"))
	if err != nil {
		log.Printf("Invalid AUTO_MIGRATE, using default true: %v", err)
		autoMigrate = true
	}

	emailServiceOverride, err := strconv.ParseBool(getEnv("EMAIL_SERVICE_OVERRIDE", "false"))
	if err != nil {
		log.Printf("Invalid EMAIL_SERVICE_OVERRIDE, using default false: %v", err)
		emailServiceOverride = false
	}

	return &Config{
		DatabaseURL:            getEnv("DATABASE_URL", ""),
		JWTSecret:              getEnv("JWT_SECRET", "default-secret-change-me"),
		EmailService:           getEnv("EMAIL_SERVICE", "mailpit"),
		BrevoAPIKey:            getEnv("BREVO_API_KEY", ""),
		SMTPHost:               getEnv("SMTP_HOST", "localhost"),
		SMTPPort:               smtpPort,
		FrontendURL:            getEnv("FRONTEND_URL", "http://localhost:3000"),
		Port:                   getEnv("PORT", "8080"),
		AutoMigrate:            autoMigrate,
		EmailServiceOverride:   emailServiceOverride,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}