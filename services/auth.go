package services

import (
	"context"
	"fmt"
	"net/url"
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

	fmt.Println("Creating New Auth Service")

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
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email", "offline_access", "avatar"},
	}

	fmt.Println("Created Auth Service")

	return as, nil
}

func (service *AuthService) RefreshAccessToken(refreshToken string) (*oauth2.Token, error) {
	oc := oauth2.Config{
		ClientID:     os.Getenv("AUTHENTIK_CLIENT_ID"),
		ClientSecret: os.Getenv("AUTHENTIK_CLIENT_SECRET"),
		Endpoint: oauth2.Endpoint{
			TokenURL: "https://auth.hostxtra.co.uk/application/o/token/",
		},
	}

	tokenSource := oc.TokenSource(context.Background(), &oauth2.Token{
		RefreshToken: refreshToken,
	})

	return tokenSource.Token()
}

func (service *AuthService) AuthLogoutURL(idToken string) string {
	endSessionURL := os.Getenv("AUTHENTIK_URL") + "/end-session/"

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
