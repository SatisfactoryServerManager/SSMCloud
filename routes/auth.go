package routes

import (
	"github.com/SatisfactoryServerManager/SSMCloud/handlers"
	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(r *gin.RouterGroup) {

	handler := handlers.NewAuthHandler()

	r.GET("/login", handler.Get_Auth_Login)
	r.GET("/callback", handler.Get_Auth_Callback)
	r.GET("/logout", handler.Get_Auth_Logout)
}
