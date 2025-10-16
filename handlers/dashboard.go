package handlers

import (
	"fmt"
	"net/http"

	"github.com/SatisfactoryServerManager/SSMCloud/api"
	"github.com/SatisfactoryServerManager/SSMCloud/services"
	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	authService *services.AuthService
}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{
		authService: services.GetAuthService(),
	}
}

func (handler *DashboardHandler) GET_Dashboard(c *gin.Context) {

	RenderTemplate(c, "pages/dashboard/index", gin.H{
		"pageTitle": "Dashboard",
	})
}

func (handler *DashboardHandler) GET_DashboardServers(c *gin.Context) {

	RenderTemplate(c, "pages/dashboard/servers", gin.H{
		"pageTitle": "Servers",
	})
}

func (handler *DashboardHandler) GET_DashboardServer(c *gin.Context) {

	agentId, _ := c.Params.Get("agentId")

	accountAgentRes, err := api.GetMyUserAccountSingleAgent(&api.APIGetUserAccountSingleAgentRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		ID: agentId,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	agentLogRes, err := api.GetAgentLog(&api.APIGetAgentLogRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		ID:   agentId,
		Type: "Agent",
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	gameLogRes, err := api.GetAgentLog(&api.APIGetAgentLogRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		ID:   agentId,
		Type: "FactoryGame",
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	RenderTemplate(c, "pages/dashboard/server", gin.H{
		"pageTitle": "Server",
		"agent":     accountAgentRes.Agents[0],
		"agentLog":  agentLogRes.AgentLogSchema,
		"gameLog":   gameLogRes.AgentLogSchema,
	})
}

func (handler *DashboardHandler) POST_DashboardServerUpdate(c *gin.Context) {
	agentId, _ := c.Params.Get("agentId")

	PostData := api.APIUpdateServerSettings{}

	if err := c.Bind(&PostData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}
	err := api.UpdateServerSettings(&api.APIUpdateServerSettingsRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		APIUpdateServerSettings: PostData,
		ID:                      agentId,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	fmt.Printf("%+v\n", PostData)

	c.Redirect(http.StatusFound, "/dashboard/servers/"+agentId)
}

func (handler *DashboardHandler) POST_DashboardServers(c *gin.Context) {

	PostData := api.APINewServerData{}

	if err := c.Bind(&PostData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
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

	for _, agent := range accountAgentsRes.Agents {
		if agent.AgentName == PostData.ServerName {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Server with the same name already exists!"})
			c.Abort()
			return
		}
	}

	res, err := api.CreateServer(&api.APICreateServerRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},

		APINewServerData: PostData,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "workflow_id": res.WorkflowId})

}

func (handler *DashboardHandler) GET_DashboardServerWorkflow(c *gin.Context) {
	workflowId := c.Param("workflowId")

	res, err := api.GetServerWorkflow(&api.APIGetServerWorkflowRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		WorkflowId: workflowId,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "workflow": res.Workflow})
}

func (handler *DashboardHandler) GET_DashboardDeleteServer(c *gin.Context) {
	agentId := c.Query("id")

	err := api.DeleteAgent(&api.APIDeleteAgentRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		ID: agentId,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.Redirect(http.StatusFound, "/dashboard")
}

func (handler *DashboardHandler) GET_DashboardCreateAccount(c *gin.Context) {

	RenderTemplate(c, "pages/dashboard/account-create", gin.H{"pageTitle": "Create Account"})
}

func (handler *DashboardHandler) POST_DashboardCreateAccount(c *gin.Context) {

	PostData := api.APINewAccountData{}
	if err := c.Bind(&PostData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	resData := gin.H{"pageTitle": "Create Account", "errorMessage": ""}

	if PostData.AccountName == "" {
		resData["errorMessage"] = "Please specify a account name"
		RenderTemplate(c, "pages/dashboard/account-create", resData)
		return
	}

	err := api.CreateAccount(&api.APICreateAccountRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		APINewAccountData: PostData,
	})

	if err != nil {
		resData["errorMessage"] = err.Error()
		RenderTemplate(c, "pages/dashboard/account-create", resData)
		return
	}

	c.Redirect(http.StatusFound, "/dashboard")
}

func (handler *DashboardHandler) GET_DashboardJoinAccount(c *gin.Context) {

	RenderTemplate(c, "pages/dashboard/account-join", gin.H{"pageTitle": "Join Account"})
}

func (handler *DashboardHandler) POST_DashboardJoinAccount(c *gin.Context) {

	PostData := api.APIJoinAccountData{}
	if err := c.Bind(&PostData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	resData := gin.H{"pageTitle": "Join Account", "errorMessage": ""}

	if PostData.JoinCode == "" {
		resData["errorMessage"] = "Please specify a join code"
		RenderTemplate(c, "pages/dashboard/account-join", resData)
		return
	}

	err := api.JoinAccount(&api.APIJoinAccountRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		APIJoinAccountData: PostData,
	})

	if err != nil {
		resData["errorMessage"] = err.Error()
		RenderTemplate(c, "pages/dashboard/account-join", resData)
		return
	}

	c.Redirect(http.StatusFound, "/dashboard")
}

func (handler *DashboardHandler) GET_DashboardSwitchAccount(c *gin.Context) {

	accountId := c.Query("id")

	err := api.SwitchAccount(&api.APISwitchAccountRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		ID: accountId,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.Redirect(http.StatusFound, "/dashboard")
}

func (handler *DashboardHandler) GET_DashboardDownloadBackup(c *gin.Context) {

	request := &api.APIDownloadFileRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		Type:    "backup",
		AgentId: c.Query("agentid"),
		UUID:    c.Query("uuid"),
	}
	api.DownloadFile(c, request)
}

func (handler *DashboardHandler) GET_DashboardDownloadSave(c *gin.Context) {

	request := &api.APIDownloadFileRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		Type:    "save",
		AgentId: c.Query("agentid"),
		UUID:    c.Query("uuid"),
	}
	api.DownloadFile(c, request)
}

func (handler *DashboardHandler) GET_DashboardDownloadLog(c *gin.Context) {

	request := &api.APIDownloadFileRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		Type:    "log",
		AgentId: c.Query("agentid"),
		LogType: c.Query("logtype"),
	}
	api.DownloadFile(c, request)
}
