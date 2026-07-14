package services

import (
	"fmt"
	"net/http"
)

var (
	authService *AuthService
)

const (
	FLASHTYPE_INFO    = "info"
	FLASHTYPE_SUCCESS = "success"
	FLASHTYPE_WARNING = "warning"
	FLASHTYPE_ERROR   = "error"
	// Carries a freshly created API key to the page that renders it in a modal.
	// Deliberately not rendered as a toast.
	FLASHTYPE_APIKEY = "apikey"
)

type FlashMessage struct {
	Type    string `json:"type"`    // success, error, info, warning
	Message string `json:"message"` // the actual text
}

func InitServices() error {
	fmt.Println("Initializing services")

	as, err := NewAuthService()
	if err != nil {
		return err
	}
	authService = as

	fmt.Println("Initialized all services")
	return nil
}

func GetAuthService() *AuthService {
	return authService
}

func ShutdownAllServices() error {

	return nil
}

func AddFlash(w http.ResponseWriter, r *http.Request, msgType, message string) error {
	session, err := GetAuthService().SessionStore.Get(r, "session")
	if err != nil {
		return err
	}

	session.AddFlash(FlashMessage{
		Type:    msgType,
		Message: message,
	})

	return session.Save(r, w)
}
