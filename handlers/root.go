package handlers

import (
	"context"
	"net/http"

	"github.com/SatisfactoryServerManager/SSMCloud/api"
	"github.com/SatisfactoryServerManager/SSMCloud/services"
	"github.com/gin-gonic/gin"
)

func RenderTemplate(c *gin.Context, tmpl string, data gin.H) {
	if _, exists := c.Get("access_token"); exists {

		session, err := services.GetAuthService().SessionStore.Get(c.Request, "session")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			c.Abort()
			return
		}

		flashes := session.Flashes()
		if len(flashes) > 0 {
			_ = session.Save(c.Request, c.Writer)
		}

		// Cast to []FlashMessage
		var flashMessages []services.FlashMessage
		for _, f := range flashes {
			if fm, ok := f.(services.FlashMessage); ok {
				flashMessages = append(flashMessages, fm)
			}
		}

		userEid := c.GetString("user_eid")

		userRes, err := api.GetMyUserGRPC(context.Background(), userEid)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			c.Abort()
			return
		}

		account, err := api.GetMyUserActiveAccountGRPC(context.Background(), userEid)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			c.Abort()
			return
		}

		accountAgentsRes, err := api.GetMyUserActiveAccountAgentsGRPC(context.Background(), userEid)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			c.Abort()
			return
		}

		linkedAccounts, err := api.GetMyUserLinkedAccountsGRPC(context.Background(), userEid)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			c.Abort()
			return
		}

		data["user"] = userRes
		data["account"] = account
		data["agents"] = accountAgentsRes
		data["linkedAccounts"] = linkedAccounts
		data["flashes"] = flashMessages

		if len(linkedAccounts) == 0 {

			path := c.Request.URL.Path
			if path != "/dashboard/account/create" && path != "/dashboard/account/join" {
				c.Redirect(http.StatusFound, "/dashboard/account/create")
				return
			}

		}
	}

	if _, exists := c.Get("IsLoggedIn"); exists {
		data["IsLoggedIn"] = c.GetBool("IsLoggedIn")

	} else {
		data["IsLoggedIn"] = false
	}

	c.HTML(http.StatusOK, tmpl, data)
}
