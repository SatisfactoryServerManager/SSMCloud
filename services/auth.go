package services

import (
	"context"
	"os"

	"github.com/boj/redistore"
	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

type AuthService struct {
	clientID     string
	clientSecret string
	authUrl      string
	redirectURL  string
	Oauth2Config *oauth2.Config
	Verifier     *oidc.IDTokenVerifier
	SessionStore *redistore.RediStore
}

func NewAuthService() (*AuthService, error) {

	as := &AuthService{}
	as.clientID = os.Getenv("AUTHENTIK_CLIENT_ID")
	as.clientSecret = os.Getenv("AUTHENTIK_CLIENT_SECRET")
	as.authUrl = os.Getenv("AUTHENTIK_URL")
	as.redirectURL = os.Getenv("APP_URL") + "/auth/callback"

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

	provider, err := oidc.NewProvider(ctx, as.authUrl)
	if err != nil {
		panic(err)
	}
	as.Verifier = provider.Verifier(&oidc.Config{ClientID: as.clientID})

	// OAuth2 config
	as.Oauth2Config = &oauth2.Config{
		ClientID:     as.clientID,
		ClientSecret: as.clientSecret,
		RedirectURL:  as.redirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email", "offline_access"},
	}

	return as, nil
}
