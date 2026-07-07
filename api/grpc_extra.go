package api

import (
	"context"
	"fmt"
	"io"
	"net/http"

	pb "github.com/SatisfactoryServerManager/ssmcloud-resources/proto/generated"
	"github.com/gin-gonic/gin"
)

// DownloadFileGRPC streams a file from the backend over gRPC and pipes it to the
// browser via the gin response writer. The backend sends the resolved filename
// in a stream header so we can set Content-Disposition.
func DownloadFileGRPC(c *gin.Context, eid, agentId string, kind pb.FrontendDownloadKind, uuid, logtype string) {
	if _, err := GetGRPCConnection(); err != nil {
		c.String(http.StatusBadGateway, "failed to get gRPC connection: %v", err)
		return
	}

	ctx := CreategRPCContext(c.Request.Context())
	stream, err := frontendServiceClient.DownloadFile(ctx, &pb.FrontendDownloadRequest{
		Eid:     eid,
		AgentId: agentId,
		Kind:    kind,
		Uuid:    uuid,
		Logtype: logtype,
	})
	if err != nil {
		c.String(http.StatusBadGateway, "failed to start download: %v", err)
		return
	}

	// Read the header (filename) before streaming the body.
	md, err := stream.Header()
	if err != nil {
		c.String(http.StatusBadGateway, "failed to read download header: %v", err)
		return
	}
	filename := "download"
	if vals := md.Get("filename"); len(vals) > 0 && vals[0] != "" {
		filename = vals[0]
	}

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Header("Content-Type", "application/octet-stream")

	for {
		chunk, rerr := stream.Recv()
		if rerr == io.EOF {
			return
		}
		if rerr != nil {
			// Headers may already be sent; best effort.
			c.String(http.StatusBadGateway, "download stream error: %v", rerr)
			return
		}
		if _, werr := c.Writer.Write(chunk.Chunk); werr != nil {
			return
		}
	}
}

func AddAccountIntegrationGRPC(ctx context.Context, eid, name string, integrationType int32, url string, eventTypes []string) error {
	if _, err := GetGRPCConnection(); err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}
	_, err := frontendServiceClient.AddAccountIntegration(CreategRPCContext(ctx), &pb.AddAccountIntegrationRequest{
		Eid:        eid,
		Name:       name,
		Type:       integrationType,
		Url:        url,
		EventTypes: eventTypes,
	})
	return err
}

func UpdateAccountIntegrationGRPC(ctx context.Context, integrationId, name string, integrationType int32, url string, eventTypes []string) error {
	if _, err := GetGRPCConnection(); err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}
	_, err := frontendServiceClient.UpdateAccountIntegration(CreategRPCContext(ctx), &pb.UpdateAccountIntegrationRequest{
		IntegrationId: integrationId,
		Name:          name,
		Type:          integrationType,
		Url:           url,
		EventTypes:    eventTypes,
	})
	return err
}

func DeleteAccountIntegrationGRPC(ctx context.Context, eid, integrationId string) error {
	if _, err := GetGRPCConnection(); err != nil {
		return fmt.Errorf("failed to get gRPC connection: %w", err)
	}
	_, err := frontendServiceClient.DeleteAccountIntegration(CreategRPCContext(ctx), &pb.DeleteAccountIntegrationRequest{
		Eid:           eid,
		IntegrationId: integrationId,
	})
	return err
}
