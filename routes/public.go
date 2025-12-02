package routes

import (
	"github.com/SatisfactoryServerManager/SSMCloud/handlers"
	"github.com/SatisfactoryServerManager/SSMCloud/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterPublicRoutes(r *gin.Engine) {
	handler := handlers.NewPublicHandler()

	r.GET("/", middleware.CheckIsLoggedIn(), handler.Get_HomePage)
}
