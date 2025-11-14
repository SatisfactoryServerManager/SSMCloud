package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/SatisfactoryServerManager/SSMCloud/services"
	"github.com/gin-gonic/gin"
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
			newToken, err := services.GetAuthService().RefreshAccessToken(refreshToken)
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
