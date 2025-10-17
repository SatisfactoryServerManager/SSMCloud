package services

var (
	authService *AuthService
)

func InitServices() error {
	as, err := NewAuthService()
	if err != nil {
		return err
	}
	authService = as
	return nil
}

func GetAuthService() *AuthService {
	return authService
}

func ShutdownAllServices() error {

	return nil
}
