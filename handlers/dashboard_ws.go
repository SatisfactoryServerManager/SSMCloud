package handlers

import (
	"context"
	"fmt"
	"net/http"

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
		userEid, _ := session.Values["user_eid"].(string)

		// Validate token is still valid
		_, err := services.GetAuthService().ValidateCustomToken(accessToken)
		if err != nil {
			fmt.Println("Token validation failed:", err)
			conn.WriteMessage(websocket.CloseMessage,
				websocket.FormatCloseMessage(4001, "Token expired"))
			break
		}

		if err := conn.ReadJSON(msg); err != nil {
			fmt.Println("Read error:", err)
			break
		}

		if msg.Action == "global.agent.action" {
			handler.WS_ServerAction(conn, accessToken, msg)
		}
		if msg.Action == "console.agent.status" {
			handler.WS_GetAgentStatus(conn, userEid, msg)
		}
		if msg.Action == "console.agent.stats" {
			handler.WS_GetAgentStats(conn, accessToken, msg)
		}
		if msg.Action == "console.agent.logs" {
			handler.WS_GetAgentLogs(conn, userEid, msg)
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

func (handler *DashboardWSHandler) WS_GetAgentStatus(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	theAgent, err := api.GetMyUserActiveAccountSingleAgentGRPC(context.Background(), userEid, msg.AgentId)

	if err != nil {
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

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

func (handler *DashboardWSHandler) WS_GetAgentLogs(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	gameLogRes, err := api.GetAgentLogGRPC(context.Background(), userEid, msg.AgentId, "FactoryGame", int32(msg.LastLogIndex))

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
