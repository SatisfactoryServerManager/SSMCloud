package handlers

import "github.com/gin-gonic/gin"

type PublicHandler struct{}

func NewPublicHandler() *PublicHandler {
	return &PublicHandler{}
}

func (handler *PublicHandler) Get_HomePage(c *gin.Context) {
	RenderTemplate(c, "public/index.tmpl", gin.H{})
}
