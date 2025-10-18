package routes

import (
	"github.com/SatisfactoryServerManager/SSMCloud/handlers"
	"github.com/SatisfactoryServerManager/SSMCloud/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterDashboardRoutes(r *gin.RouterGroup) {
	handler := handlers.NewDashboardHandler()
	r.GET("/", middleware.AuthRequired(), handler.GET_Dashboard)
	r.GET("/servers", middleware.AuthRequired(), handler.GET_DashboardServers)
	r.POST("/servers", middleware.AuthRequired(), handler.POST_DashboardServers)
	r.GET("/servers/delete", middleware.AuthRequired(), handler.GET_DashboardDeleteServer)
	r.GET("/servers/:agentId", middleware.AuthRequired(), handler.GET_DashboardServer)
	r.POST("/servers/:agentId", middleware.AuthRequired(), handler.POST_DashboardServerUpdate)
	r.GET("/servers/workflows/:workflowId", middleware.AuthRequired(), handler.GET_DashboardServerWorkflow)

	r.GET("/account", middleware.AuthRequired(), handler.GET_DashboardAccount)
	r.GET("/account/users", middleware.AuthRequired(), handler.GET_DashboardAccountUsers)
	r.GET("/account/audit", middleware.AuthRequired(), handler.GET_DashboardAccountAudit)
	r.GET("/account/create", middleware.AuthRequired(), handler.GET_DashboardCreateAccount)
	r.POST("/account/create", middleware.AuthRequired(), handler.POST_DashboardCreateAccount)
	r.GET("/account/join", middleware.AuthRequired(), handler.GET_DashboardJoinAccount)
	r.POST("/account/join", middleware.AuthRequired(), handler.POST_DashboardJoinAccount)
	r.GET("/account/switch", middleware.AuthRequired(), handler.GET_DashboardSwitchAccount)

    r.GET("/profile", middleware.AuthRequired(), handler.GET_DashboardProfile)

	r.GET("/download/backup", middleware.AuthRequired(), handler.GET_DashboardDownloadBackup)
	r.GET("/download/save", middleware.AuthRequired(), handler.GET_DashboardDownloadSave)
	r.GET("/download/log", middleware.AuthRequired(), handler.GET_DashboardDownloadLog)
}
