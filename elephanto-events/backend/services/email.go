package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
)

type EmailService struct {
	service    string
	brevoKey   string
	smtpHost   string
	smtpPort   int
	frontendURL string
}

type BrevoEmail struct {
	Sender      BrevoSender    `json:"sender"`
	To          []BrevoContact `json:"to"`
	Subject     string         `json:"subject"`
	HTMLContent string         `json:"htmlContent"`
}

type BrevoSender struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type BrevoContact struct {
	Email string `json:"email"`
}

func NewEmailService(service, brevoKey, smtpHost string, smtpPort int, frontendURL string) *EmailService {
	return &EmailService{
		service:     service,
		brevoKey:    brevoKey,
		smtpHost:    smtpHost,
		smtpPort:    smtpPort,
		frontendURL: frontendURL,
	}
}

func (e *EmailService) SendMagicLink(email, token string) error {
	magicLink := fmt.Sprintf("%s/verify?token=%s", e.frontendURL, token)
	
	subject := "Welcome to ElephantTO Events - Your Secure Login Link"
	htmlContent := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<title>ElephantTO Events - Secure Login</title>
		</head>
		<body style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #2563eb 0%%, #7c3aed 100%%); margin: 0; padding: 20px;">
			<div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; border: 1px solid rgba(255, 255, 255, 0.2);">
				<div style="text-align: center; margin-bottom: 30px;">
					<h1 style="color: white; font-size: 32px; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🐘🗼 ElephantTO Events</h1>
					<p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 10px 0 0 0;">Toronto's Premier Event Platform</p>
				</div>
				
				<div style="background: rgba(255, 255, 255, 0.9); border-radius: 15px; padding: 25px; margin-bottom: 20px;">
					<h2 style="color: #333; margin-top: 0;">Welcome! Your secure login link is ready</h2>
					<p style="color: #666; font-size: 16px; line-height: 1.6;">
						Click the button below to securely sign in to your ElephantTO Events account. This link will expire in 15 minutes for your security.
					</p>
					
					<div style="text-align: center; margin: 30px 0;">
						<a href="%s" style="background: linear-gradient(135deg, #2563eb 0%%, #7c3aed 100%%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4); transition: transform 0.2s;">
							🔐 Sign In to ElephantTO Events
						</a>
					</div>
					
					<p style="color: #999; font-size: 14px; line-height: 1.6;">
						If the button doesn't work, copy and paste this link into your browser:<br>
						<span style="word-break: break-all; color: #667eea;">%s</span>
					</p>
				</div>
				
				<div style="text-align: center; color: rgba(255, 255, 255, 0.8); font-size: 14px;">
					<p>This email was sent to %s. If you didn't request this login, you can safely ignore this email.</p>
					<p style="margin-top: 20px;">ElephantTO Events - Making memories, one event at a time in Toronto 🎉</p>
				</div>
			</div>
		</body>
		</html>
	`, magicLink, magicLink, email)

	switch e.service {
	case "brevo":
		return e.sendViaBrevo(email, subject, htmlContent)
	case "mailpit":
		return e.sendViaSMTP(email, subject, htmlContent)
	default:
		return fmt.Errorf("unsupported email service: %s", e.service)
	}
}

func (e *EmailService) sendViaBrevo(email, subject, htmlContent string) error {
	if e.brevoKey == "" {
		return fmt.Errorf("brevo API key not configured")
	}

	emailData := BrevoEmail{
		Sender: BrevoSender{
			Email: "noreply@elephantto-events.com",
			Name:  "ElephantTO Events",
		},
		To: []BrevoContact{
			{Email: email},
		},
		Subject:     subject,
		HTMLContent: htmlContent,
	}

	jsonData, err := json.Marshal(emailData)
	if err != nil {
		return fmt.Errorf("failed to marshal email data: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.brevo.com/v3/smtp/email", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api-key", e.brevoKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("failed to send email, status code: %d", resp.StatusCode)
	}

	return nil
}

func (e *EmailService) sendViaSMTP(email, subject, htmlContent string) error {
	from := "noreply@elephantto-events.com"
	
	fmt.Printf("Attempting to send email to %s via SMTP %s:%d\n", email, e.smtpHost, e.smtpPort)
	
	message := fmt.Sprintf("From: %s\r\n", from)
	message += fmt.Sprintf("To: %s\r\n", email)
	message += fmt.Sprintf("Subject: %s\r\n", subject)
	message += "MIME-Version: 1.0\r\n"
	message += "Content-Type: text/html; charset=UTF-8\r\n"
	message += "\r\n"
	message += htmlContent

	addr := fmt.Sprintf("%s:%d", e.smtpHost, e.smtpPort)
	
	// Connect to SMTP server without authentication (for Mailpit)
	fmt.Printf("Connecting to SMTP server at %s\n", addr)
	conn, err := smtp.Dial(addr)
	if err != nil {
		fmt.Printf("Failed to connect to SMTP server: %v\n", err)
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer conn.Close()

	// Set sender
	fmt.Printf("Setting sender: %s\n", from)
	if err := conn.Mail(from); err != nil {
		fmt.Printf("Failed to set sender: %v\n", err)
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// Set recipient
	fmt.Printf("Setting recipient: %s\n", email)
	if err := conn.Rcpt(email); err != nil {
		fmt.Printf("Failed to set recipient: %v\n", err)
		return fmt.Errorf("failed to set recipient: %w", err)
	}

	// Send message
	fmt.Printf("Sending message data\n")
	writer, err := conn.Data()
	if err != nil {
		fmt.Printf("Failed to get data writer: %v\n", err)
		return fmt.Errorf("failed to get data writer: %w", err)
	}
	defer writer.Close()

	if _, err := writer.Write([]byte(message)); err != nil {
		fmt.Printf("Failed to write message: %v\n", err)
		return fmt.Errorf("failed to write message: %w", err)
	}

	fmt.Printf("Email sent successfully to %s\n", email)
	return nil
}