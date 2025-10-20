package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sonh/qs"
)

var (
	client  *http.Client
	baseURL url.URL
)

var encoder = qs.NewEncoder()

func initClient() {
	client = http.DefaultClient

	scheme := "https"
	if os.Getenv("APP_MODE") == "development" {
		scheme = "http"
	}
	baseURL = url.URL{
		Scheme: scheme,
		Host:   os.Getenv("BACKEND_URL"),
		Path:   "/api/v2/",
	}
}

func BuildURL(endpoint string, queryValues *url.Values) string {
	endpt := baseURL.ResolveReference(&url.URL{Path: endpoint})
	if queryValues != nil {
		endpt.RawQuery = queryValues.Encode()
	}

	return endpt.String()
}

func GetValuesFromRequest(request interface{}) (*url.Values, error) {
	values, err := encoder.Values(request)
	if err != nil {
		return nil, err
	}
	return &values, nil
}

func get(endpoint string, accessToken string, queryValues *url.Values, resData APIResult) error {

	if client == nil {
		initClient()
	}

	url := BuildURL(endpoint, queryValues)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	req.Header.Add("Accept", "application/json")
	req.Header.Add("apikey", os.Getenv("BACKEND_SECRET_KEY"))

	if accessToken != "" {
		req.Header.Add("x-ssm-auth-token", accessToken)
	}

	res, err := client.Do(req)
	if err != nil {
		return err
	}

	defer res.Body.Close()
	if err := json.NewDecoder(res.Body).Decode(&resData); err != nil {
		return err
	}

	if !resData.IsSuccess() {
		return fmt.Errorf("api returned error: %s", resData.GetError())
	}

	return nil
}

func post(endpoint string, accessToken string, queryValues *url.Values, body interface{}, resData APIResult) error {

	if client == nil {
		initClient()
	}

	url := BuildURL(endpoint, queryValues)

	fmt.Println(url, endpoint)

	data, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return err
	}

	req.Header.Add("Accept", "application/json")
	req.Header.Add("apikey", os.Getenv("BACKEND_SECRET_KEY"))

	if accessToken != "" {
		req.Header.Add("x-ssm-auth-token", accessToken)
	}

	res, err := client.Do(req)
	if err != nil {
		return err
	}

	defer res.Body.Close()
	if err := json.NewDecoder(res.Body).Decode(&resData); err != nil {
		return err
	}

	if !resData.IsSuccess() {
		return fmt.Errorf("api returned error: %s", resData.GetError())
	}

	return nil
}

func delete(endpoint string, accessToken string, queryValues *url.Values, resData APIResult) error {

	if client == nil {
		initClient()
	}

	url := BuildURL(endpoint, queryValues)

	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}

	req.Header.Add("Accept", "application/json")
	req.Header.Add("apikey", os.Getenv("BACKEND_SECRET_KEY"))

	if accessToken != "" {
		req.Header.Add("x-ssm-auth-token", accessToken)
	}

	res, err := client.Do(req)
	if err != nil {
		return err
	}

	defer res.Body.Close()
	if err := json.NewDecoder(res.Body).Decode(&resData); err != nil {
		return err
	}

	if !resData.IsSuccess() {
		return fmt.Errorf("api returned error: %s", resData.GetError())
	}

	return nil
}

func DownloadFile(c *gin.Context, request *APIDownloadFileRequest) {
	values, _ := GetValuesFromRequest(request)

	if client == nil {
		initClient()
	}

	url := BuildURL(fmt.Sprintf("frontend/download/%s", request.Type), values)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		c.String(http.StatusBadGateway, "failed to download file: %v", err)
		return
	}

	req.Header.Add("Accept", "application/json")
	req.Header.Add("apikey", os.Getenv("BACKEND_SECRET_KEY"))

	if request.AccessToken != "" {
		req.Header.Add("x-ssm-auth-token", request.AccessToken)
	}

	resp, err := client.Do(req)
	if err != nil {
		c.String(http.StatusBadGateway, "failed to download file: %v", err)
		return
	}

	defer resp.Body.Close()

	// If the remote server returned an error code
	if resp.StatusCode != http.StatusOK {

		resData := APIResponse{}
		if err := json.NewDecoder(resp.Body).Decode(&resData); err != nil {
			return
		}

		c.String(http.StatusBadGateway, "remote server returned: %s body: %+v", resp.Status, resData)
		return
	}

	// Set headers for file download
	if cd := resp.Header.Get("Content-Disposition"); cd != "" {
		c.Header("Content-Disposition", cd)
	}
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	c.Header("Content-Length", resp.Header.Get("Content-Length"))

	// Stream directly from the external response to the client
	io.Copy(c.Writer, resp.Body)
}

func PingBackend() error {
	resData := &APIResponse{}
	if err := get("ping", "", nil, resData); err != nil {
		return err
	}
	return nil
}

func GetMyUser(request *APIGetUserRequest) (*APIGetUserResponse, error) {
	values, err := encoder.Values(request)
	if err != nil {
		return nil, err
	}

	userRes := &APIGetUserResponse{}
	if err := get("frontend/users/me", request.AccessToken, &values, userRes); err != nil {
		if strings.Contains(userRes.GetError(), "no document") {
			return nil, nil
		}
		return nil, err
	}

	return userRes, nil
}

func GetMyUserAccount(request *APIRequest) (*APIGetUserAccountResponse, error) {
	accountRes := &APIGetUserAccountResponse{}
	if err := get("frontend/users/me/account", request.AccessToken, nil, accountRes); err != nil {
		if strings.Contains(accountRes.GetError(), "no document") {
			return nil, nil
		}
		return nil, err
	}

	return accountRes, nil
}

func GetMyUserAccountAgents(request *APIRequest) (*APIGetUserAccountAgentsResponse, error) {
	accountAgentsRes := &APIGetUserAccountAgentsResponse{}
	if err := get("frontend/users/me/account/agents", request.AccessToken, nil, accountAgentsRes); err != nil {
		return nil, err
	}

	return accountAgentsRes, nil
}

func GetMyUserAccountSingleAgent(request *APIGetUserAccountSingleAgentRequest) (*APIGetUserAccountSingleAgentResponse, error) {

	values, err := encoder.Values(request)
	if err != nil {
		return nil, err
	}

	accountAgentRes := &APIGetUserAccountSingleAgentResponse{}
	if err := get("frontend/users/me/account/agents", request.AccessToken, &values, accountAgentRes); err != nil {
		return nil, err
	}

	return accountAgentRes, nil
}

func GetAgentLog(request *APIGetAgentLogRequest) (*APIGetAgentLogResponse, error) {
	values, err := encoder.Values(request)
	if err != nil {
		return nil, err
	}

	agentLogsRes := &APIGetAgentLogResponse{}
	if err := get("frontend/users/me/account/agents/log", request.AccessToken, &values, agentLogsRes); err != nil {
		return nil, err
	}

	return agentLogsRes, nil
}

func GetUserLinkedAccounts(request *APIRequest) (*APIGetUserLinkedAccountsResponse, error) {

	accountsRes := &APIGetUserLinkedAccountsResponse{}
	if err := get("frontend/users/me/accounts", request.AccessToken, nil, accountsRes); err != nil {
		return nil, err
	}

	return accountsRes, nil
}

func CreateUser(request *APICreateUserRequest) error {

	res := &APIResponse{}
	if err := post("frontend/users", request.AccessToken, nil, request, res); err != nil {
		return err
	}

	return nil
}

func CreateAccount(request *APICreateAccountRequest) error {

	res := &APIResponse{}
	if err := post("frontend/users/me/accounts", request.AccessToken, nil, request, res); err != nil {
		return err
	}

	return nil
}

func JoinAccount(request *APIJoinAccountRequest) error {

	res := &APIResponse{}
	if err := post("frontend/users/me/accounts/join", request.AccessToken, nil, request, res); err != nil {
		return err
	}

	return nil
}

func SwitchAccount(request *APISwitchAccountRequest) error {

	values, err := encoder.Values(request)
	if err != nil {
		return err
	}

	res := &APIResponse{}
	if err := get("frontend/users/me/accounts/switch", request.AccessToken, &values, res); err != nil {
		return err
	}

	return nil
}

func CheckUserExistsOrCreate(request *APIGetUserRequest) error {

	theUser, err := GetMyUser(request)
	if err != nil {
		return err
	}

	if theUser == nil {
		if err := CreateUser(&APICreateUserRequest{
			APIRequest: request.APIRequest,
			Email:      request.Email,
			ExternalId: request.ExternalId,
		}); err != nil {
			return err
		}
		return nil
	}

	return nil
}

func CreateServer(request *APICreateServerRequest) (*APICreateServerResponse, error) {
	res := &APICreateServerResponse{}
	if err := post("frontend/users/me/account/agents", request.AccessToken, nil, request, res); err != nil {
		return nil, err
	}

	return res, nil
}

func GetServerWorkflow(request *APIGetServerWorkflowRequest) (*APIGetServerWorkflowResponse, error) {

	values, err := encoder.Values(request)
	if err != nil {
		return nil, err
	}

	accountsRes := &APIGetServerWorkflowResponse{}
	if err := get("frontend/workflows", request.AccessToken, &values, accountsRes); err != nil {
		return nil, err
	}

	return accountsRes, nil
}

func DeleteAgent(request *APIDeleteAgentRequest) error {

	values, err := encoder.Values(request)
	if err != nil {
		return err
	}

	res := &APIResponse{}

	if err := delete("frontend/users/me/account/agents", request.AccessToken, &values, res); err != nil {
		return err
	}

	return nil
}

func UpdateServerSettings(request *APIUpdateServerSettingsRequest) error {

	res := &APIResponse{}
	if err := post("frontend/users/me/account/agents/settings", request.AccessToken, nil, request, res); err != nil {
		return err
	}

	return nil
}

func GetAccountAudit(request *APIGetAccountAuditRequest) (*APIGetAccountAuditResponse, error) {
	values, err := encoder.Values(request)
	if err != nil {
		return nil, err
	}

	res := &APIGetAccountAuditResponse{}

	if err := get("frontend/users/me/account/audit", request.AccessToken, &values, res); err != nil {
		return nil, err
	}

	return res, nil
}

func GetAccountUsers(request *APIRequest) (*APIGetAccountUsersResponse, error) {
	res := &APIGetAccountUsersResponse{}

	if err := get("frontend/users/me/account/users", request.AccessToken, nil, res); err != nil {
		return nil, err
	}

	return res, nil
}

func GetMods(request *APIGetModsRequest) (*APIGetModsResponse, error) {

	values, err := encoder.Values(request)
	if err != nil {
		return nil, err
	}
	res := &APIGetModsResponse{}

	if err := get("frontend/mods", request.AccessToken, &values, res); err != nil {
		return nil, err
	}

	return res, nil

}
