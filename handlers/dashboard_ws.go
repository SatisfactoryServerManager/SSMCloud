package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/SatisfactoryServerManager/SSMCloud/api"
	"github.com/SatisfactoryServerManager/SSMCloud/services"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type DashboardWSHandler struct{}

func NewDashboardWSHandler() *DashboardWSHandler {
	return &DashboardWSHandler{}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In production, validate origin properly
		return true
	},
}

func (handler *DashboardWSHandler) WSHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Println("Upgrade error:", err)
		return
	}
	defer conn.Close()

	for {

		msg := &api.WSMessage{}

		session, _ := services.GetAuthService().SessionStore.Get(c.Request, "session")

		accessToken, _ := session.Values["access_token"].(string)
		refreshToken, _ := session.Values["refresh_token"].(string)
		expiry, _ := session.Values["expiry"].(time.Time)

		// If access token expired, refresh it
		if time.Now().After(expiry) && refreshToken != "" {
			newToken, err := services.GetAuthService().RefreshAccessToken(refreshToken)
			if err != nil {
				fmt.Println("Token refresh failed:", err)
				conn.WriteMessage(websocket.CloseMessage,
					websocket.FormatCloseMessage(4001, "Token expired"))
				break
			}

			session.Values["access_token"] = newToken.AccessToken
			session.Values["refresh_token"] = newToken.RefreshToken
			session.Values["expiry"] = newToken.Expiry
			session.Save(c.Request, c.Writer)
			accessToken = newToken.AccessToken
		}

		if err := conn.ReadJSON(msg); err != nil {
			fmt.Println("Read error:", err)
			break
		}

		if msg.Action == "global.agent.action" {
			handler.WS_ServerAction(conn, accessToken, msg)
		}
		if msg.Action == "console.agent.status" {
			handler.WS_GetAgentStatus(conn, accessToken, msg)
		}
		if msg.Action == "console.agent.stats" {
			handler.WS_GetAgentStats(conn, accessToken, msg)
		}
		if msg.Action == "console.agent.logs" {
			handler.WS_GetAgentLogs(conn, accessToken, msg)
		}
	}
}

func (handler *DashboardWSHandler) WS_ServerAction(conn *websocket.Conn, accessToken string, msg *api.WSMessage) {
	err := api.PostServerTask(&api.APIServerTaskRequest{
		APIRequest: api.APIRequest{
			AccessToken: accessToken,
		},
		Action:  msg.ServerAction,
		AgentID: msg.AgentId,
	})

	if err != nil {
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data: map[string]string{
			"serverAction": msg.ServerAction,
		},
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_GetAgentStatus(conn *websocket.Conn, accessToken string, msg *api.WSMessage) {
	accountAgentRes, err := api.GetMyUserAccountSingleAgent(&api.APIGetUserAccountSingleAgentRequest{
		APIRequest: api.APIRequest{
			AccessToken: accessToken,
		},
		ID: msg.AgentId,
	})

	if err != nil {
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	theAgent := accountAgentRes.Agents[0]

	res := api.WSResponse{
		Action: msg.Action,
		Data:   theAgent.Status,
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_GetAgentStats(conn *websocket.Conn, accessToken string, msg *api.WSMessage) {
	statsRes, err := api.GetAgentStats(&api.APIGetAgentStatsRequest{
		APIRequest: api.APIRequest{
			AccessToken: accessToken,
		},
		AgentId: msg.AgentId,
	})

	if err != nil {
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data:   statsRes.Stats,
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_GetAgentLogs(conn *websocket.Conn, accessToken string, msg *api.WSMessage) {
	gameLogRes, err := api.GetAgentLog(&api.APIGetAgentLogRequest{
		APIRequest: api.APIRequest{
			AccessToken: accessToken,
		},
		ID:        msg.AgentId,
		Type:      "FactoryGame",
		LastIndex: msg.LastLogIndex,
	})

	if err != nil {
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data:   gameLogRes.LogLines,
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}
