package handlers

import (
	"net/http"

	"github.com/SatisfactoryServerManager/SSMCloud/api"
	"github.com/gin-gonic/gin"
)

func RenderTemplate(c *gin.Context, tmpl string, data gin.H) {
	if _, exists := c.Get("access_token"); exists {

		userRes, err := api.GetMyUser(&api.APIGetUserRequest{
			APIRequest: api.APIRequest{
				AccessToken: c.GetString("access_token"),
			},
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			c.Abort()
			return
		}

		accountRes, err := api.GetMyUserAccount(&api.APIRequest{
			AccessToken: c.GetString("access_token"),
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			c.Abort()
			return
		}

		accountAgentsRes, err := api.GetMyUserAccountAgents(&api.APIRequest{
			AccessToken: c.GetString("access_token"),
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			c.Abort()
			return
		}

		linkedAccounts, err := api.GetUserLinkedAccounts(&api.APIRequest{
			AccessToken: c.GetString("access_token"),
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
			c.Abort()
			return
		}

		data["user"] = userRes.User
		data["account"] = accountRes.Account
		data["agents"] = accountAgentsRes.Agents
		data["linkedAccounts"] = linkedAccounts.Accounts

		if len(linkedAccounts.Accounts) == 0 {

			path := c.Request.URL.Path
			if path != "/dashboard/account/create" && path != "/dashboard/account/join" {
				c.Redirect(http.StatusFound, "/dashboard/account/create")
				return
			}

		}
	}

	if _, exists := c.Get("IsLoggedIn"); exists {
		data["IsLoggedIn"] = true

	} else {
		data["IsLoggedIn"] = false
	}

	c.HTML(http.StatusOK, tmpl, data)
}
