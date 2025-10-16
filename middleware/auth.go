package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/SatisfactoryServerManager/SSMCloud/services"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

func CheckIsLoggedIn() gin.HandlerFunc {
	return func(c *gin.Context) {

		session, _ := services.GetAuthService().SessionStore.Get(c.Request, "session")
		accessToken, _ := session.Values["access_token"].(string)

		// If no token, force login
		if accessToken == "" {
			c.Set("IsLoggedIn", false)
			return
		}
		c.Set("IsLoggedIn", true)
	}
}

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		session, _ := services.GetAuthService().SessionStore.Get(c.Request, "session")

		accessToken, _ := session.Values["access_token"].(string)
		refreshToken, _ := session.Values["refresh_token"].(string)
		expiry, _ := session.Values["expiry"].(time.Time)

		// If no token, force login
		if accessToken == "" {
			c.Redirect(http.StatusFound, "/auth/login")
			c.Abort()
			return
		}

		// If access token expired, refresh it
		if time.Now().After(expiry) && refreshToken != "" {
			fmt.Println("Refreshing access token...")
			newToken, err := refreshAccessToken(refreshToken)
			if err != nil {
				c.Redirect(http.StatusFound, "/auth/login")
				c.Abort()
				return
			}

			// Save new token
			session.Values["access_token"] = newToken.AccessToken
			session.Values["refresh_token"] = newToken.RefreshToken
			session.Values["expiry"] = newToken.Expiry
			session.Save(c.Request, c.Writer)

			accessToken = newToken.AccessToken
		}

		c.Set("access_token", accessToken)
		c.Next()
	}
}

func refreshAccessToken(refreshToken string) (*oauth2.Token, error) {
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
