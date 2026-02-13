package services

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"time"

	"github.com/boj/redistore"
	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
)

type AuthService struct {
	clientID     string
	clientSecret string
	authUrl      string
	baseAuthUrl  string
	redirectURL  string
	jwtSecret    string
	Oauth2Config *oauth2.Config
	Verifier     *oidc.IDTokenVerifier
	SessionStore *redistore.RediStore
}

func NewAuthService() (*AuthService, error) {

	fmt.Println("Creating New Auth Service")

	as := &AuthService{}
	as.clientID = os.Getenv("AUTHENTIK_CLIENT_ID")
	as.clientSecret = os.Getenv("AUTHENTIK_CLIENT_SECRET")
	baseAuthUrl := os.Getenv("AUTHENTIK_URL")
	as.baseAuthUrl = baseAuthUrl
	providerName := os.Getenv("AUTHENTIK_PROVIDER")

	// Construct the full issuer URL for OIDC discovery
	// For Authentik, it should be: https://auth.example.com/application/o/{provider}/
	as.authUrl = baseAuthUrl + "/application/o/" + providerName + "/"

	as.redirectURL = os.Getenv("APP_URL") + "/auth/callback"
	as.jwtSecret = os.Getenv("JWT_SECRET")
	if as.jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is required")
	}

	redisHost := os.Getenv("REDIS_HOST")
	redisUser := os.Getenv("REDIS_USER")
	redisPass := os.Getenv("REDIS_PASS")

	rs, err := redistore.NewRediStore(10, "tcp", redisHost, redisUser, redisPass, []byte("ssm-session-key"))
	if err != nil {
		return nil, err
	}
	rs.SetMaxLength(8192)
	rs.SetMaxAge(3600)

	as.SessionStore = rs

	ctx := context.Background()

	fmt.Printf("Attempting OIDC discovery at: %s\n", as.authUrl)
	provider, err := oidc.NewProvider(ctx, as.authUrl)
	if err != nil {
		fmt.Printf("OIDC Provider creation failed: %v\n", err)
		panic(err)
	}
	as.Verifier = provider.Verifier(&oidc.Config{ClientID: as.clientID})

	// OAuth2 config
	as.Oauth2Config = &oauth2.Config{
		ClientID:     as.clientID,
		ClientSecret: as.clientSecret,
		RedirectURL:  as.redirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email", "offline_access", "avatar"},
	}

	fmt.Println("Created Auth Service")
	fmt.Printf("Token Endpoint: %s\n", as.Oauth2Config.Endpoint.TokenURL)

	return as, nil
}

func (service *AuthService) AuthLogoutURL(idToken string) string {
	endSessionURL := service.baseAuthUrl + "/application/o/logout/"

	params := url.Values{}
	params.Set("client_id", service.Oauth2Config.ClientID)

	// optional: redirect user back to frontend after logout
	params.Set("post_logout_redirect_uri", os.Getenv("APP_URL"))

	if idToken != "" {
		params.Set("id_token_hint", idToken)
	}

	redirectURL := endSessionURL + "?" + params.Encode()
	return redirectURL
}

// CustomClaims represents the custom JWT claims
type CustomClaims struct {
	jwt.RegisteredClaims
}

// GenerateCustomToken creates a custom JWT token with the subject
func (service *AuthService) GenerateCustomToken(subject string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token valid for 24 hours

	claims := &CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "ssmcloud",
			Subject:   subject,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(service.jwtSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ValidateCustomToken validates and parses the custom JWT token
func (service *AuthService) ValidateCustomToken(tokenString string) (*CustomClaims, error) {
	claims := &CustomClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Verify the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(service.jwtSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}
