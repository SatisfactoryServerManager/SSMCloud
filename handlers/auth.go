package handlers

import (
	"context"
	"net/http"

	"github.com/SatisfactoryServerManager/SSMCloud/api"
	"github.com/SatisfactoryServerManager/SSMCloud/services"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"golang.org/x/oauth2"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		authService: services.GetAuthService(),
	}
}

func (handler *AuthHandler) Get_Auth_Login(c *gin.Context) {
	url := services.GetAuthService().Oauth2Config.AuthCodeURL("state-123", oauth2.AccessTypeOffline)
	c.Redirect(http.StatusFound, url)
}

func (handler *AuthHandler) Get_Auth_Callback(c *gin.Context) {
	code := c.Query("code")
	token, err := services.GetAuthService().Oauth2Config.Exchange(context.Background(), code)
	if err != nil {
		c.String(500, "Exchange failed: %v", err)
		return
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		c.String(500, "no id_token field in oauth2 token")
		return
	}

	idtok, err := services.GetAuthService().Verifier.Verify(context.Background(), rawIDToken)
	if err != nil {
		c.String(401, "Invalid ID Token: %v", err)
		return
	}
	var claims map[string]interface{}
	idtok.Claims(&claims)

	// Store claims in session
	session, _ := services.GetAuthService().SessionStore.Get(c.Request, "session")
	session.Values["access_token"] = token.AccessToken
	session.Values["refresh_token"] = token.RefreshToken
	session.Values["expiry"] = token.Expiry
	session.Save(c.Request, c.Writer)
	err = session.Save(c.Request, c.Writer)
	if err != nil {
		c.String(500, "cant save session: %v", err)
		return
	}

	if err := api.CheckUserExistsOrCreate(&api.APIGetUserRequest{
		APIRequest: api.APIRequest{
			AccessToken: token.AccessToken,
		},
		Email:      claims["email"].(string),
		ExternalId: claims["sub"].(string),
	}); err != nil {
		c.String(500, "cant check user: %v", err)
		return
	}

	accountRes, err := api.GetUserLinkedAccounts(&api.APIRequest{
		AccessToken: token.AccessToken,
	})

	if err != nil {
		c.String(500, "cant get linked accounts: %v", err)
		return
	}

	if len(accountRes.Accounts) == 0 {
		c.Redirect(http.StatusFound, "/dashboard/account/create")
		return
	}

	c.Redirect(http.StatusFound, "/dashboard")
}

func (handler *AuthHandler) Get_Auth_Logout(c *gin.Context) {
	session, _ := services.GetAuthService().SessionStore.Get(c.Request, "session")
	session.Values = make(map[interface{}]interface{})
	session.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   -1, // session cookie
		HttpOnly: true,
	}
	session.Save(c.Request, c.Writer)
	c.Redirect(http.StatusFound, "/")
}
