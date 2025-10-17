package api

import (
	models "github.com/SatisfactoryServerManager/ssmcloud-resources/models/v2"
)

type APIResult interface {
	IsSuccess() bool
	GetError() string
}

type APIResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (r APIResponse) IsSuccess() bool  { return r.Success }
func (r APIResponse) GetError() string { return r.Error }

type APIRequest struct {
	AccessToken string `json:"-" qs:"-"`
}

type APIGetUserRequest struct {
	APIRequest
	ID         string `qs:"_id,omitempty"`
	Email      string `qs:"email,omitempty"`
	ExternalId string `qs:"eid,omitempty"`
}

type APIGetUserResponse struct {
	APIResponse
	User models.UserSchema `json:"user"`
}

type APICreateUserRequest struct {
	APIRequest
	Email      string `qs:"email,omitempty"`
	ExternalId string `qs:"eid,omitempty"`
}

type APIGetUserAccountResponse struct {
	APIResponse
	Account models.AccountSchema `json:"account"`
}
type APIGetUserAccountAgentsResponse struct {
	APIResponse
	Agents []models.AgentSchema `json:"agents"`
}

type APIGetUserAccountSingleAgentRequest struct {
	APIRequest
	ID string `qs:"_id,omitempty"`
}

type APIDeleteAgentRequest struct {
	APIRequest
	ID string `qs:"_id"`
}

type APIGetUserAccountSingleAgentResponse struct {
	APIResponse
	Agents []models.AgentSchema `json:"agents"`
}

type APIGetUserLinkedAccountsResponse struct {
	APIResponse
	Accounts []models.AccountSchema `json:"accounts"`
}

type APINewServerData struct {
	ServerName       string `form:"serverName" json:"serverName"`
	ServerPort       int    `form:"serverPort" json:"serverPort"`
	ServerMemory     int64  `form:"serverMemory" json:"serverMemory"`
	ServerAdminPass  string `form:"serverAdminPass" json:"serverAdminPass"`
	ServerClientPass string `form:"serverClientPass" json:"serverClientPass"`
	ServerAPIKey     string `form:"serverApiKey" json:"ServerApiKey"`
}

type APICreateServerRequest struct {
	APIRequest
	APINewServerData
}

type APICreateServerResponse struct {
	APIResponse
	WorkflowId string `json:"workflow_id"`
}

type APIGetServerWorkflowRequest struct {
	APIRequest
	WorkflowId string `qs:"workflowId"`
}

type APIGetServerWorkflowResponse struct {
	APIResponse
	Workflow models.WorkflowSchema `json:"workflow"`
}

type APIUpdateServerSettings struct {
	ConfigSetting        string  `form:"_ConfigSetting" json:"configSetting"`
	UpdateOnStart        string  `form:"inp_updateonstart" json:"updateOnStart"`
	AutoRestart          string  `form:"inp_autorestart" json:"autoRestart"`
	AutoPause            string  `form:"inp_autoPause" json:"autoPause"`
	AutoSaveOnDisconnect string  `form:"inp_autoSaveOnDisconnect" json:"autoSaveOnDisconnect"`
	AutoSaveInterval     int     `form:"inp_autoSaveInterval" json:"autoSaveInterval"`
	SeasonalEvents       string  `form:"inp_seasonalEvents" json:"seasonalEvents"`
	MaxPlayers           int     `form:"inp_maxplayers" json:"maxPlayers"`
	WorkerThreads        int     `form:"inp_workerthreads" json:"workerThreads"`
	Branch               string  `form:"inp_sfbranch" json:"branch"`
	BackupInterval       float32 `form:"inp_backupinterval" json:"backupInterval"`
	BackupKeep           int     `form:"inp_backupkeep" json:"backupKeep"`
}

type APIUpdateServerSettingsRequest struct {
	APIRequest
	APIUpdateServerSettings
	ID string `json:"agentId"`
}

type APIGetAgentLogRequest struct {
	APIRequest
	ID   string `qs:"_id"`
	Type string `qs:"type"`
}

type APIGetAgentLogResponse struct {
	APIResponse
	models.AgentLogSchema `json:"agentLog"`
}

type APINewAccountData struct {
	AccountName string `json:"accountName" form:"inp_accountName"`
}

type APICreateAccountRequest struct {
	APIRequest
	APINewAccountData
}

type APIJoinAccountData struct {
	JoinCode string `json:"joinCode" form:"inp_joincode"`
}

type APIJoinAccountRequest struct {
	APIRequest
	APIJoinAccountData
}

type APISwitchAccountRequest struct {
	APIRequest
	ID string `qs:"_id"`
}

type APIDownloadFileRequest struct {
	APIRequest
	AgentId string `qs:"agentid"`
	UUID    string `qs:"uuid,omitempty"`
	LogType string `qs:"logtype,omitempty"`
	Type    string `json:"-" qs:"-"`
}

type APIGetAccountAuditRequest struct {
	APIRequest
	AuditType string `qs:"auditType,omitempty"`
}

type APIGetAccountAuditResponse struct {
	APIResponse
	Audit []models.AccountAuditSchema `json:"audit"`
}

type APIGetAccountUsersResponse struct {
	APIResponse
	Users []models.UserSchema `json:"users"`
}
