package api

import (
	"context"
	"crypto/tls"
	"fmt"
	"os"
	"sync"

	pb "github.com/SatisfactoryServerManager/ssmcloud-resources/proto/generated"
	pbModels "github.com/SatisfactoryServerManager/ssmcloud-resources/proto/generated/models"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	grpcConn              *grpc.ClientConn
	once                  sync.Once
	frontendServiceClient pb.FrontendServiceClient
)

func init() {
	godotenv.Load()
	// Initialize gRPC connection and client on startup
	_, err := GetGRPCConnection()
	if err != nil {
		fmt.Printf("Warning: Failed to initialize gRPC connection during startup: %v\n", err)
	}
}

// GetGRPCConnection returns a singleton gRPC connection to the backend service
func GetGRPCConnection() (*grpc.ClientConn, error) {
	var err error
	once.Do(func() {
		grpcAddr := os.Getenv("GRPC_URL")
		if grpcAddr == "" {
			grpcAddr = "grpc.ssmcloud-dev.hostxtra.co.uk:443" // Default fallback with TLS port
		}

		fmt.Printf("Connecting to gRPC server at: %s\n", grpcAddr)

		// Create TLS credentials
		tlsConfig := &tls.Config{}
		creds := credentials.NewTLS(tlsConfig)

		if os.Getenv("APP_MODE") == "development" {
			creds = insecure.NewCredentials()
			fmt.Println("Using insecure gRPC credentials for development mode")
		}

		grpcConn, err = grpc.NewClient(
			grpcAddr,
			grpc.WithTransportCredentials(creds),
		)

		if err != nil {
			fmt.Printf("Failed to connect to gRPC server: %v\n", err)
			return
		}

		fmt.Println("Successfully connected to gRPC server")

		// Create and cache the FrontendService client
		frontendServiceClient = pb.NewFrontendServiceClient(grpcConn)
	})

	return grpcConn, err
}

// CloseGRPCConnection closes the gRPC connection
func CloseGRPCConnection() error {
	if grpcConn != nil {
		return grpcConn.Close()
	}
	return nil
}

// CheckUserExistsOrCreateGRPC calls the backend gRPC FrontendService to check or create a user
func CheckUserExistsOrCreateGRPC(ctx context.Context, email, externalID, username string) error {
	// Ensure the connection and client are initialized
	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	// Call the CheckUserExistsOrCreate RPC using cached client
	_, err = frontendServiceClient.CheckUserExistsOrCreate(ctx, &pb.CheckUserExistsOrCreateRequest{
		Email:    email,
		Eid:      externalID,
		Username: username,
	})

	if err != nil {
		return fmt.Errorf("gRPC call failed: %w", err)
	}

	return nil
}

func GetMyUserGRPC(ctx context.Context, externalID string) (*pb.User, error) {

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	userpbres, err := frontendServiceClient.GetMyUser(ctx, &pb.GetMyUserRequest{
		Eid: externalID,
	})

	if err != nil {
		return nil, err
	}

	return userpbres.User, nil
}

func GetMyUserLinkedAccountsGRPC(ctx context.Context, externalID string) ([]*pb.Account, error) {

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbLinkedAccountsRes, err := frontendServiceClient.GetMyUserLinkedAccounts(ctx, &pb.GetMyUserLinkedAccountsRequest{
		Eid: externalID,
	})

	if err != nil {
		return nil, err
	}

	return pbLinkedAccountsRes.LinkedAccounts, nil
}

func GetMyUserActiveAccountGRPC(ctx context.Context, externalID string) (*pb.Account, error) {

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbActiveAccountRes, err := frontendServiceClient.GetMyUserActiveAccount(ctx, &pb.GetMyUserActiveAccountRequest{
		Eid: externalID,
	})

	if err != nil {
		return nil, err
	}

	return pbActiveAccountRes.ActiveAccount, nil
}

func GetMyUserActiveAccountAgentsGRPC(ctx context.Context, externalID string) ([]*pbModels.Agent, error) {

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbAgentsRes, err := frontendServiceClient.GetMyUserActiveAccountAgents(ctx, &pb.GetMyUserActiveAccountAgentsRequest{
		Eid: externalID,
	})

	if err != nil {
		return nil, err
	}

	return pbAgentsRes.Agents, nil
}

func GetMyUserActiveAccountSingleAgentGRPC(ctx context.Context, externalID string, agentId string) (*pbModels.Agent, error) {
	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbAgentsRes, err := frontendServiceClient.GetMyUserActiveAccountSingleAgent(ctx, &pb.GetMyUserActiveAccountSingleAgentRequest{
		Eid:     externalID,
		AgentId: agentId,
	})

	if err != nil {
		return nil, err
	}

	return pbAgentsRes.Agent, nil
}

func GetAgentLogGRPC(ctx context.Context, externalID string, agentId string, logType string, lastIndex int32) (*pbModels.AgentLog, error) {
	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbLogRes, err := frontendServiceClient.GetAgentLog(ctx, &pb.GetAgentLogRequest{
		Eid:       externalID,
		AgentId:   agentId,
		Type:      logType,
		LastIndex: lastIndex,
	})

	if err != nil {
		return nil, err
	}

	return pbLogRes.Log, nil
}
