package middleware

import (
	"fmt"
	"net/http"

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

		customToken, _ := session.Values["access_token"].(string)

		// If no token, force login
		if customToken == "" {
			c.Redirect(http.StatusFound, "/auth/login")
			c.Abort()
			return
		}

		// Validate custom token
		claims, err := services.GetAuthService().ValidateCustomToken(customToken)
		if err != nil {
			fmt.Println("Token validation failed:", err)
			c.Redirect(http.StatusFound, "/auth/login")
			c.Abort()
			return
		}

		c.Set("access_token", customToken)
		c.Set("user_eid", claims.Subject)
	}
}
