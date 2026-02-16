package api

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"os"
	"sync"

	pb "github.com/SatisfactoryServerManager/ssmcloud-resources/proto/generated"
	pbModels "github.com/SatisfactoryServerManager/ssmcloud-resources/proto/generated/models"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
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

func CreategRPCContext(ctx context.Context) context.Context {
	md := metadata.New(map[string]string{
		"x-ssmcloud-key": os.Getenv("BACKEND_SECRET_KEY"),
	})
	return metadata.NewOutgoingContext(ctx, md)
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

	ctx = CreategRPCContext(ctx)

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

func GetUserGRPC(ctx context.Context, externalID string) (*pbModels.User, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	userpbres, err := frontendServiceClient.GetUser(ctx, &pb.GetUserRequest{
		Eid: externalID,
	})

	if err != nil {
		return nil, err
	}

	return userpbres.User, nil
}

func GetUserLinkedAccountsGRPC(ctx context.Context, externalID string) ([]*pbModels.Account, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbLinkedAccountsRes, err := frontendServiceClient.GetUserLinkedAccounts(ctx, &pb.GetUserLinkedAccountsRequest{
		Eid: externalID,
	})

	if err != nil {
		return nil, err
	}

	return pbLinkedAccountsRes.LinkedAccounts, nil
}

func GetUserActiveAccountGRPC(ctx context.Context, externalID string) (*pbModels.Account, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbActiveAccountRes, err := frontendServiceClient.GetUserActiveAccount(ctx, &pb.GetUserActiveAccountRequest{
		Eid: externalID,
	})

	if err != nil {
		return nil, err
	}

	return pbActiveAccountRes.ActiveAccount, nil
}

func GetUserActiveAccountAgentsGRPC(ctx context.Context, externalID string) ([]*pbModels.Agent, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbAgentsRes, err := frontendServiceClient.GetUserActiveAccountAgents(ctx, &pb.GetUserActiveAccountAgentsRequest{
		Eid: externalID,
	})

	if err != nil {
		return nil, err
	}

	return pbAgentsRes.Agents, nil
}

func GetUserActiveAccountSingleAgentGRPC(ctx context.Context, externalID string, agentId string) (*pbModels.Agent, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbAgentsRes, err := frontendServiceClient.GetAgent(ctx, &pb.GetAgentRequest{
		Eid:     externalID,
		AgentId: agentId,
	})

	if err != nil {
		return nil, err
	}

	return pbAgentsRes.Agent, nil
}

func GetAgentLogGRPC(ctx context.Context, externalID string, agentId string, logType string, lastIndex int32) (*pbModels.AgentLog, error) {
	ctx = CreategRPCContext(ctx)

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

func GetAgentStatsGRPC(ctx context.Context, externalID string, agentId string) ([]*pbModels.AgentStat, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbStatRes, err := frontendServiceClient.GetAgentStats(ctx, &pb.GetAgentStatsRequest{
		Eid:     externalID,
		AgentId: agentId,
	})

	if err != nil {
		return nil, err
	}

	return pbStatRes.Stats, nil

}

func CreateAgentTaskGPRC(ctx context.Context, externalID string, agentId string, action string, taskData interface{}) error {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	_, err = frontendServiceClient.CreateAgentTask(ctx, &pb.CreateAgentTaskRequest{
		Eid:     externalID,
		AgentId: agentId,
		Action:  action,
		//TaskData: taskData,
	})

	return err
}

func GetAgentModsGRPC(ctx context.Context, externalID string, agentId string, page int32, sort string, direction string, search string) (*pb.GetAgentModsResponse, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbModsRes, err := frontendServiceClient.GetAgentMods(ctx, &pb.GetAgentModsRequest{
		Eid:       externalID,
		AgentId:   agentId,
		Page:      page,
		Sort:      sort,
		Direction: direction,
		Search:    search,
	})
	return pbModsRes, err
}

func InstallAgentModGRPC(ctx context.Context, externalID string, agentId string, modReference string) error {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	_, err = frontendServiceClient.InstallAgentMod(ctx, &pb.InstallAgentModRequest{
		Eid:          externalID,
		AgentId:      agentId,
		ModReference: modReference,
	})

	return err
}

func UninstallAgentModGRPC(ctx context.Context, externalID string, agentId string, modReference string) error {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	_, err = frontendServiceClient.UninstallAgentMod(ctx, &pb.UninstallAgentModRequest{
		Eid:          externalID,
		AgentId:      agentId,
		ModReference: modReference,
	})

	return err
}

func UpdateAgentSettingsGRPC(ctx context.Context, externalID string, agentId string, settings APIUpdateServerSettings) error {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbSettings := &pb.ServerSettings{
		ConfigSetting:        settings.ConfigSetting,
		UpdateOnStart:        settings.UpdateOnStart,
		AutoRestart:          settings.AutoRestart,
		AutoPause:            settings.AutoPause,
		AutoSaveOnDisconnect: settings.AutoSaveOnDisconnect,
		AutoSaveInterval:     int32(settings.AutoSaveInterval),
		SeasonalEvents:       settings.SeasonalEvents,
		MaxPlayers:           int32(settings.MaxPlayers),
		WorkerThreads:        int32(settings.WorkerThreads),
		Branch:               settings.Branch,
		BackupInterval:       settings.BackupInterval, // proto float = Go float32
		BackupKeep:           int32(settings.BackupKeep),
		ModReference:         settings.ModReference,
		ModConfig:            settings.ModConfig,
	}

	_, err = frontendServiceClient.UpdateAgentSettings(ctx, &pb.UpdateAgentSettingsRequest{
		Eid:      externalID,
		AgentId:  agentId,
		Settings: pbSettings,
	})
	return err
}

func UploadSaveFileGRPC(ctx context.Context, externalID string, agentId string, file io.Reader, filename, contentType string) error {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	stream, err := frontendServiceClient.UploadSaveFile(ctx)
	if err != nil {
		return fmt.Errorf("failed to create upload save file stream: %w", err)
	}

	// Send metadata first
	err = stream.Send(&pb.UploadSaveFileRequest{
		Data: &pb.UploadSaveFileRequest_Metadata{
			Metadata: &pb.FileMetadata{
				Eid:         externalID,
				AgentId:     agentId,
				Filename:    filename,
				ContentType: contentType,
			},
		},
	})
	if err != nil {
		return fmt.Errorf("error sending metadata with error: %s", err.Error())
	}

	buffer := make([]byte, 32*1024) // 32KB chunks

	for {
		n, err := file.Read(buffer)
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("error reading file chunk with error: %s", err.Error())
		}

		err = stream.Send(&pb.UploadSaveFileRequest{
			Data: &pb.UploadSaveFileRequest_Chunk{
				Chunk: buffer[:n],
			},
		})
		if err != nil {
			return fmt.Errorf("error sending chunk with error: %s", err.Error())
		}
	}

	resp, err := stream.CloseAndRecv()
	if err != nil {
		fmt.Println(resp)
		return err
	}

	fmt.Println(resp)

	return nil
}

func GetUserActiveAccountUsersGRPC(ctx context.Context, externalID string) ([]*pbModels.User, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbModsRes, err := frontendServiceClient.GetUserActiveAccountUsers(ctx, &pb.GetUserActiveAccountUsersRequest{
		Eid: externalID,
	})
	return pbModsRes.Users, err
}

func GetUserActiveAccountAuditsGRPC(ctx context.Context, externalID string, auditType string) ([]*pbModels.AccountAudit, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	pbModsRes, err := frontendServiceClient.GetUserActiveAccountAudits(ctx, &pb.GetUserActiveAccountAuditsRequest{
		Eid:  externalID,
		Type: auditType,
	})
	return pbModsRes.Audits, err
}

func SwitchActiveAccountGRPC(ctx context.Context, externalId string, accountId string) error {

	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	_, err = frontendServiceClient.SwitchActiveAccount(ctx, &pb.SwitchActiveAccountRequest{
		Eid:       externalId,
		AccountId: accountId,
	})

	if err != nil {
		return err
	}

	return nil
}

func CreateAccountGRPC(ctx context.Context, externalId string, accountName string) error {

	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	_, err = frontendServiceClient.CreateAccount(ctx, &pb.CreateAccountRequest{
		Eid:         externalId,
		AccountName: accountName,
	})

	if err != nil {
		return err
	}

	return nil
}

func JoinAccountGRPC(ctx context.Context, externalId string, joinCode string) error {

	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	_, err = frontendServiceClient.JoinAccount(ctx, &pb.JoinAccountRequest{
		Eid:      externalId,
		JoinCode: joinCode,
	})

	if err != nil {
		return err
	}

	return nil
}

func CreateAgentGRPC(ctx context.Context, externalId string, agentName, apiKey, adminPass, clientPass string, port int32, memory float32) (string, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return "", fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	createRes, err := frontendServiceClient.CreateAgent(ctx, &pb.CreateAgentRequest{
		Eid:        externalId,
		AgentName:  agentName,
		ApiKey:     apiKey,
		AdminPass:  adminPass,
		ClientPass: clientPass,
		Port:       port,
		Memory:     memory,
	})

	if err != nil {
		return "", err
	}

	return createRes.WorkflowId, nil
}

func DeleteAgentGRPC(ctx context.Context, externalId string, agentId string) error {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	_, err = frontendServiceClient.DeleteAgent(ctx, &pb.DeleteAgentRequest{
		Eid:     externalId,
		AgentId: agentId,
	})

	if err != nil {
		return err
	}

	return nil
}

func GetAgentWorkflowGRPC(ctx context.Context, workflowId string) (*pbModels.Workflow, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	workflowRes, err := frontendServiceClient.GetAgentWorkflow(ctx, &pb.GetAgentWorkflowRequest{
		WorkflowId: workflowId,
	})

	if err != nil {
		return nil, err
	}

	return workflowRes.Workflow, nil
}

func DeleteAccountGRPC(ctx context.Context, externalId, accountId string) error {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	_, err = frontendServiceClient.DeleteAccount(ctx, &pb.DeleteAccountRequest{
		Eid:       externalId,
		AccountId: accountId,
	})

	if err != nil {
		return err
	}

	return nil
}

func GetAccountIntegrationsGRPC(ctx context.Context, externalId string) ([]*pbModels.AccountIntegration, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	integrationsRes, err := frontendServiceClient.GetUserActiveAccountIntegrations(ctx, &pb.GetUserActiveAccountIntegrationsRequest{
		Eid: externalId,
	})

	if err != nil {
		return nil, err
	}

	return integrationsRes.Integrations, nil
}

func GetAccountIntegrationEventsGRPC(ctx context.Context, integrationId string) ([]*pbModels.IntegrationEvent, error) {
	ctx = CreategRPCContext(ctx)

	_, err := GetGRPCConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to get gRPC connection: %w", err)
	}

	integrationsRes, err := frontendServiceClient.GetAccountIntegrationEvents(ctx, &pb.GetAccountIntegrationEventsRequest{
		IntegrationId: integrationId,
	})

	if err != nil {
		return nil, err
	}

	return integrationsRes.Events, nil
}
