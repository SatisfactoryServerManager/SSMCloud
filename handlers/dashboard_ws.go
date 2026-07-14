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
			handler.WS_ServerAction(conn, userEid, msg)
		}
		if msg.Action == "console.agent.status" {
			handler.WS_GetAgentStatus(conn, userEid, msg)
		}
		if msg.Action == "console.agent.stats" {
			handler.WS_GetAgentStats(conn, userEid, msg)
		}
		if msg.Action == "console.agent.logs" {
			handler.WS_GetAgentLogs(conn, userEid, msg)
		}
		if msg.Action == "console.agent.logfile" {
			handler.WS_GetAgentLogFile(conn, userEid, msg)
		}
		if msg.Action == "console.agent.map" {
			handler.WS_GetAgentMap(conn, userEid, msg)
		}
		if msg.Action == "console.agent.mods" {
			handler.WS_GetAgentMods(conn, userEid, msg)
		}
		if msg.Action == "console.agent.mods.preview" {
			handler.WS_PreviewModChange(conn, userEid, msg)
		}
		if msg.Action == "console.agent.mods.apply" {
			handler.WS_ApplyModChange(conn, userEid, msg)
		}
		if msg.Action == "console.agent.tasks" {
			handler.WS_GetAgentTasks(conn, userEid, msg)
		}
		if msg.Action == "console.agent.task.cancel" {
			handler.WS_CancelAgentTask(conn, userEid, msg)
		}
		if msg.Action == "console.agent.task.retry" {
			handler.WS_RetryAgentTask(conn, userEid, msg)
		}
	}
}

func (handler *DashboardWSHandler) WS_ServerAction(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	_, err := api.CreateAgentTaskGPRC(context.Background(), userEid, msg.AgentId, msg.ServerAction, nil)

	if err != nil {
		fmt.Println("Error posting server task:", err)
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
	theAgent, err := api.GetUserActiveAccountSingleAgentGRPC(context.Background(), userEid, msg.AgentId)

	if err != nil {
		fmt.Println("Error getting agent status:", err)
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

func (handler *DashboardWSHandler) WS_GetAgentMap(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	theAgent, err := api.GetUserActiveAccountSingleAgentGRPC(context.Background(), userEid, msg.AgentId)

	if err != nil {
		fmt.Println("Error getting agent map:", err)
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data:   theAgent.MapData,
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_GetAgentStats(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	statsRes, err := api.GetAgentStatsGRPC(context.Background(), userEid, msg.AgentId)

	if err != nil {
		fmt.Println("Error getting agent stats:", err)
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data:   statsRes,
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_GetAgentTasks(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	tasks, err := api.GetAgentTasksGRPC(context.Background(), userEid, msg.AgentId)

	if err != nil {
		fmt.Println("Error getting agent tasks:", err)
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data:   tasks,
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_CancelAgentTask(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	err := api.CancelAgentTaskGRPC(context.Background(), userEid, msg.TaskId)

	if err != nil {
		fmt.Println("Error cancelling agent task:", err)
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data: map[string]string{
			"taskId": msg.TaskId,
		},
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_RetryAgentTask(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	err := api.RetryAgentTaskGRPC(context.Background(), userEid, msg.TaskId)

	if err != nil {
		fmt.Println("Error retrying agent task:", err)
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data: map[string]string{
			"taskId": msg.TaskId,
		},
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

func (handler *DashboardWSHandler) WS_GetAgentMods(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	modsRes, err := api.GetAgentModsGRPC(context.Background(), userEid, msg.AgentId, int32(msg.Page), msg.Sort, msg.Direction, msg.Search, msg.FilterAvailable, msg.FilterInstalled, msg.OnlyUpdatable, msg.IncludeHidden)

	if err != nil {
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data: map[string]interface{}{
			"mods":      modsRes.Mods,
			"pages":     modsRes.Pages,
			"totalMods": modsRes.TotalCount,
			"agentMods": modsRes.AgentMods,
		},
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_PreviewModChange(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	previewRes, err := api.PreviewModChangeGRPC(context.Background(), userEid, msg.AgentId, msg.Op, msg.ModReference, msg.Version)

	if err != nil {
		fmt.Println("Error previewing mod change:", err)
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data:   previewRes,
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_ApplyModChange(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	applyRes, err := api.ApplyModChangeGRPC(context.Background(), userEid, msg.AgentId, msg.Op, msg.ModReference, msg.Version, msg.ApplyNow)

	if err != nil {
		fmt.Println("Error applying mod change:", err)
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data:   applyRes,
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}

func (handler *DashboardWSHandler) WS_GetAgentLogFile(conn *websocket.Conn, userEid string, msg *api.WSMessage) {
	logType := msg.LogType
	if logType == "" {
		logType = "FactoryGame"
	}

	logRes, err := api.GetAgentLogGRPC(context.Background(), userEid, msg.AgentId, logType, int32(msg.LastLogIndex))

	if err != nil {
		conn.WriteJSON(api.WSResponse{Action: "error", Data: err.Error()})
		return
	}

	res := api.WSResponse{
		Action: msg.Action,
		Data: map[string]interface{}{
			"logType":  logType,
			"logLines": logRes.LogLines,
		},
	}

	if err := conn.WriteJSON(res); err != nil {
		fmt.Println("Write error:", err)
	}
}
