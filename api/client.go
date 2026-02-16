package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sonh/qs"
)

var (
	client  *http.Client
	baseURL url.URL
)

var encoder = qs.NewEncoder()

func initClient() {
	client = &http.Client{
		Timeout: 15 * time.Second,
	}

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

func put(endpoint string, accessToken string, queryValues *url.Values, body interface{}, resData APIResult) error {

	if client == nil {
		initClient()
	}

	url := BuildURL(endpoint, queryValues)

	fmt.Println(url, endpoint)

	data, _ := json.Marshal(body)
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(data))
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

func AddAccountIntegration(request *APIPostAccountIntegrationsRequest) error {
	res := &APIResponse{}

	if err := post("frontend/users/me/account/integrations/add", request.AccessToken, nil, request, res); err != nil {
		return err
	}

	return nil
}

func UpdateAccountIntegration(request *APIUpdateAccountIntegrationsRequest) error {
	res := &APIResponse{}

	if err := put("frontend/users/me/account/integrations/update", request.AccessToken, nil, request, res); err != nil {
		return err
	}

	return nil
}

func DeleteAccountIntegration(request *APIDeleteAccountIntegrationsRequest) error {

	values, err := encoder.Values(request)
	if err != nil {
		return err
	}

	res := &APIResponse{}

	if err := delete("frontend/users/me/account/integrations/delete", request.AccessToken, &values, res); err != nil {
		return err
	}

	return nil
}
