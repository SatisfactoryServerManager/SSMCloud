package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/SatisfactoryServerManager/SSMCloud/api"
	"github.com/SatisfactoryServerManager/SSMCloud/services"
	v2 "github.com/SatisfactoryServerManager/ssmcloud-resources/models/v2"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/csrf"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	eventTypes = []v2.IntegrationEventType{
		v2.IntegrationEventTypeAgentCreated,
		v2.IntegrationEventTypeAgentRemoved,
		v2.IntegrationEventTypeAgentOnline,
		v2.IntegrationEventTypeAgentOffline,
		v2.IntegrationEventTypeUserAdded,
		v2.IntegrationEventTypeUserRemoved,
		v2.IntegrationEventTypePlayerJoined,
		v2.IntegrationEventTypePlayerLeft,
	}
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

func (handler *DashboardHandler) GET_DashboardIntegrations(c *gin.Context) {

	integrationRes, err := api.GetAccountIntegrations(&api.APIRequest{
		AccessToken: c.GetString("access_token"),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	RenderTemplate(c, "pages/dashboard/integrations", gin.H{
		"pageTitle":        "Integrations",
		"globalEventTypes": eventTypes,
		"integrations":     integrationRes.Integrations,
		"csrfField":        csrf.TemplateField(c.Request),
	})
}

func (handler *DashboardHandler) POST_DashboardIntegrations(c *gin.Context) {

	PostData := api.APIPostAccountIntegrationsData{}
	if err := c.BindJSON(&PostData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	if PostData.URL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "url was empty"})
		c.Abort()
		return
	}

	if len(PostData.EventTypes) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "event types was empty"})
		c.Abort()
		return
	}

	if err := api.AddAccountIntegration(&api.APIPostAccountIntegrationsRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		APIPostAccountIntegrationsData: PostData,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	if err := services.AddFlash(c.Writer, c.Request, "success", "Successfully added integration"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "error": ""})
}

func (handler *DashboardHandler) GET_DashboardIntegration(c *gin.Context) {
	integrationId, err := primitive.ObjectIDFromHex(c.Param("id"))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	integrationRes, err := api.GetAccountIntegrations(&api.APIRequest{
		AccessToken: c.GetString("access_token"),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	integrationEventsRes, err := api.GetAccountIntegrationEvents(&api.APIGetAccountIntegrationEventsRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		IntegrationId: integrationId.Hex(),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	var theIntegration *v2.AccountIntegrationSchema
	for idx := range integrationRes.Integrations {
		integration := &integrationRes.Integrations[idx]
		if integration.ID == integrationId {
			theIntegration = integration
		}
	}

	if theIntegration == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "integration not found"})
		c.Abort()
		return
	}

	RenderTemplate(c, "pages/dashboard/integration", gin.H{
		"pageTitle":         "Integrations",
		"globalEventTypes":  eventTypes,
		"integration":       theIntegration,
		"integrationEvents": integrationEventsRes.IntegrationEvents,
	})
}

func (handler *DashboardHandler) POST_DashboardUpdateIntegration(c *gin.Context) {

	id := c.Param("id")

	PostData := api.APIPostAccountIntegrationsData{}
	if err := c.BindJSON(&PostData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	if PostData.URL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "url was empty"})
		c.Abort()
		return
	}

	if len(PostData.EventTypes) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "event types was empty"})
		c.Abort()
		return
	}

	if err := api.UpdateAccountIntegration(&api.APIUpdateAccountIntegrationsRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		APIPostAccountIntegrationsData: PostData,
		IntegrationId:                  id,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	if err := services.AddFlash(c.Writer, c.Request, "success", "Successfully updated integration"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "error": ""})
}

func (handler *DashboardHandler) GET_DashboardDeleteIntegration(c *gin.Context) {

	id := c.Param("id")

	if err := api.DeleteAccountIntegration(&api.APIDeleteAccountIntegrationsRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		IntegrationId: id,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	services.AddFlash(c.Writer, c.Request, "success", "Successfully deleted integration")

	c.Redirect(http.StatusFound, "/dashboard")
}

func (handler *DashboardHandler) GET_DashboardMods(c *gin.Context) {
	agentId := c.Query("agentid")
	page := c.Query("page")
	sort := c.Query("sort")
	direction := c.Query("direction")
	search := c.Query("search")

	pageInt, _ := strconv.Atoi(page)

	modsRes, err := api.GetAgentModsGRPC(context.Background(), c.GetString("user_eid"), agentId, int32(pageInt), sort, direction, search)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "mods": modsRes.Mods, "pages": modsRes.Pages, "totalMods": modsRes.TotalMods, "agentModConfig": modsRes.AgentModConfig})
}

func (handler *DashboardHandler) GET_DashboardServers(c *gin.Context) {

	RenderTemplate(c, "pages/dashboard/servers", gin.H{
		"pageTitle": "Servers",
	})
}

func (handler *DashboardHandler) GET_DashboardServer(c *gin.Context) {

	agentId, _ := c.Params.Get("agentId")

	userEid := c.GetString("user_eid")

	theAgent, err := api.GetMyUserActiveAccountSingleAgentGRPC(context.Background(), userEid, agentId)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	agentLogRes, err := api.GetAgentLogGRPC(context.Background(), userEid, agentId, "Agent", 0)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	gameLogRes, err := api.GetAgentLogGRPC(context.Background(), userEid, agentId, "FactoryGame", 0)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	RenderTemplate(c, "pages/dashboard/server", gin.H{
		"pageTitle": "Server",
		"agent":     theAgent,
		"agentLog":  agentLogRes,
		"gameLog":   gameLogRes,
		"csrfField": csrf.TemplateField(c.Request),
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
	err := api.UpdateAgentSettingsGRPC(context.Background(), c.GetString("user_eid"), agentId, PostData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	if PostData.ConfigSetting == "modsettings" {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}

	c.Redirect(http.StatusFound, "/dashboard/servers/"+agentId)
}

func (handler *DashboardHandler) POST_DashboardServerSaveFile(c *gin.Context) {
	agentId, _ := c.Params.Get("agentId")

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer file.Close()

	err = api.UploadSaveFileGRPC(context.Background(), c.GetString("user_eid"), agentId, file, fileHeader.Filename, fileHeader.Header.Get("Content-Type"))

	if err != nil {
		fmt.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	services.AddFlash(c.Writer, c.Request, "success", "Save file has been uploaded")

	// Redirect after successful upload
	c.Redirect(http.StatusFound, "/dashboard/servers/"+agentId)
}

func (handler *DashboardHandler) POST_DashboardServers(c *gin.Context) {

	PostData := api.APINewServerData{}

	if err := c.Bind(&PostData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	userEid := c.GetString("user_eid")

	agentsRes, err := api.GetMyUserActiveAccountAgentsGRPC(context.Background(), userEid)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	for _, agent := range agentsRes {
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

func (handler *DashboardHandler) GET_DashboardAccount(c *gin.Context) {
	RenderTemplate(c, "pages/dashboard/account", gin.H{"pageTitle": "Account"})
}

func (handler *DashboardHandler) GET_DashboardAccountAudit(c *gin.Context) {

	auditType := c.Query("type")

	auditRes, err := api.GetMyUserActiveAccountAuditsGRPC(context.Background(), c.GetString("user_eid"), auditType)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "audit": auditRes})
}

func (handler *DashboardHandler) GET_DashboardAccountUsers(c *gin.Context) {
	usersRes, err := api.GetMyUserActiveAccountUsersGRPC(context.Background(), c.GetString("user_eid"))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "users": usersRes})
}

func (handler *DashboardHandler) GET_DashboardCreateAccount(c *gin.Context) {

	RenderTemplate(c, "pages/dashboard/account-create", gin.H{"pageTitle": "Create Account", "csrfField": csrf.TemplateField(c.Request)})
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

func (handler *DashboardHandler) GET_DashboardDeleteAccount(c *gin.Context) {
	accountId := c.Query("id")

	err := api.DeleteAccount(&api.APIDeleteAccountRequest{
		APIRequest: api.APIRequest{
			AccessToken: c.GetString("access_token"),
		},
		AccountID: accountId,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	services.AddFlash(c.Writer, c.Request, "success", "Successfully deleted account")

	c.Redirect(http.StatusFound, "/dashboard")
}

func (handler *DashboardHandler) GET_DashboardJoinAccount(c *gin.Context) {

	RenderTemplate(c, "pages/dashboard/account-join", gin.H{"pageTitle": "Join Account", "csrfField": csrf.TemplateField(c.Request)})
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

func (handler *DashboardHandler) GET_DashboardProfile(c *gin.Context) {

	RenderTemplate(c, "pages/dashboard/profile", gin.H{"pageTitle": "Profile", "csrfField": csrf.TemplateField(c.Request)})
}

func (handler *DashboardHandler) POST_DashboardMods_Install(c *gin.Context) {

	PostData := api.APIModData{}
	if err := c.Bind(&PostData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	err := api.InstallAgentModGRPC(context.Background(), c.GetString("user_eid"), PostData.AgentID, PostData.ModRef)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (handler *DashboardHandler) POST_DashboardMods_Uninstall(c *gin.Context) {

	PostData := api.APIModData{}
	if err := c.Bind(&PostData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	err := api.UninstallAgentModGRPC(context.Background(), c.GetString("user_eid"), PostData.AgentID, PostData.ModRef)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
