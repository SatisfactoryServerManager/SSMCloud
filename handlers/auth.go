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

	// Extract subject from authentik token
	subject := claims["sub"].(string)

	// Generate custom token with same subject
	customToken, err := services.GetAuthService().GenerateCustomToken(subject)
	if err != nil {
		c.String(500, "failed to generate custom token: %v", err)
		return
	}

	// Store only custom token in session
	session, _ := services.GetAuthService().SessionStore.Get(c.Request, "session")
	session.Values["access_token"] = customToken
	session.Values["user_eid"] = subject
	err = session.Save(c.Request, c.Writer)
	if err != nil {
		c.String(500, "cant save session: %v", err)
		return
	}

	email := claims["email"].(string)
	username, _ := claims["preferred_username"].(string) // Optional: adjust based on available claims

	// Call gRPC service to check/create user
	if err := api.CheckUserExistsOrCreateGRPC(context.Background(), email, subject, username); err != nil {
		c.String(500, "cant check/create user via gRPC: %v", err)
		return
	}

	linkedAccounts, err := api.GetUserLinkedAccountsGRPC(context.Background(), subject)

	if err != nil {
		c.String(500, "cant get linked accounts: %v", err)
		return
	}

	if len(linkedAccounts) == 0 {
		c.Redirect(http.StatusFound, "/dashboard/account/create")
		return
	}

	c.Redirect(http.StatusFound, "/dashboard")
}

func (handler *AuthHandler) Get_Auth_Logout(c *gin.Context) {
	session, _ := services.GetAuthService().SessionStore.Get(c.Request, "session")

	idToken := session.Values["id_token"].(string)

	session.Values = make(map[interface{}]interface{})
	session.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   -1, // session cookie
		HttpOnly: true,
	}
	session.Save(c.Request, c.Writer)

	redirectUrl := services.GetAuthService().AuthLogoutURL(idToken)

	c.Redirect(http.StatusFound, redirectUrl)
}
