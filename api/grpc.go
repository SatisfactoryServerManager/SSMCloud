package api

import (
	"context"
	"crypto/tls"
	"fmt"
	"os"
	"sync"

	pb "github.com/SatisfactoryServerManager/ssmcloud-resources/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
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
