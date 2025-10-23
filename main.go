package main

import (
	"context"
	"embed"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"math"
	"net/http"
	"os"
	"path"
	"slices"
	"strings"
	"time"

	"github.com/SatisfactoryServerManager/SSMCloud/api"
	"github.com/SatisfactoryServerManager/SSMCloud/routes"
	"github.com/SatisfactoryServerManager/SSMCloud/services"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

//go:embed static/*
var publicFS embed.FS

//go:embed templates/*
var templatesFS embed.FS

//go:embed docs/*
var docsFS embed.FS

func init() {
	godotenv.Load()
	gob.Register(map[string]interface{}{})
	gob.Register(time.Time{})
	gob.Register(services.FlashMessage{})
}

func main() {

	if err := services.InitServices(); err != nil {
		panic(err)
	}

	if err := api.PingBackend(); err != nil {
		fmt.Printf("test backend connection failed with error: %s\n", err.Error())
	}

	router := gin.Default()

	tmpl := template.New("").Funcs(template.FuncMap{
		"formatDate": func(t time.Time) string {
			if t.IsZero() {
				return ""
			}
			return t.Format("January 2, 2006 03:04:05 PM")
		},
		"OIDtoString": func(id primitive.ObjectID) string {
			return id.Hex()
		},
		"dict": func(values ...interface{}) (map[string]interface{}, error) {
			if len(values)%2 != 0 {
				return nil, fmt.Errorf("invalid dict call: must have even args")
			}
			m := make(map[string]interface{}, len(values)/2)
			for i := 0; i < len(values); i += 2 {
				key, ok := values[i].(string)
				if !ok {
					return nil, fmt.Errorf("dict keys must be strings")
				}
				m[key] = values[i+1]
			}
			return m, nil
		},
		"toBytes": func(size int64) string {
			const (
				KB = 1024
				MB = KB * 1024
				GB = MB * 1024
			)
			switch {
			case size >= GB:
				return fmt.Sprintf("%.2f GB", float64(size)/float64(GB))
			case size >= MB:
				return fmt.Sprintf("%.2f MB", float64(size)/float64(MB))
			case size >= KB:
				return fmt.Sprintf("%.2f KB", float64(size)/float64(KB))
			default:
				return fmt.Sprintf("%d Bytes", size)
			}
		},
		"displayLogSnippet": func(str string) []string {
			logStrings := strings.Split(str, "\n")
			slices.Reverse(logStrings)
			return logStrings
		},
		"shortenApikey": func(prefix string, apikey string) string {
			apikeySplit := strings.Split(apikey, prefix+"-")
			shortKey := apikeySplit[1][len(apikeySplit[1])-4:]
			return prefix + "-••••" + shortKey
		},
		"RoundTo": func(value float64, digits int) float64 {
			factor := math.Pow(10, float64(digits))
			return math.Round(value*factor) / factor
		},
		"toJson": func(v interface{}) template.JS {
			a, _ := json.Marshal(v)
			return template.JS(a) // safe because it's JSON
		},
		"toJsonPretty": func(v interface{}) template.JS {
			a, _ := json.MarshalIndent(v, "", "  ")
			return template.JS(a) // safe because it's JSON
		},
	})

	// Parse the embedded templates
	tmpl, err := tmpl.ParseFS(templatesFS, "templates/includes/**/*.tmpl", "templates/pages/**/*.tmpl")
	if err != nil {
		log.Fatalf("failed to parse templates: %v", err)
	}

	router.SetHTMLTemplate(tmpl)

	publicFiles, err := fs.Sub(publicFS, "static")
	if err != nil {
		log.Fatal(err)
	}

	docsFiles, err := fs.Sub(docsFS, "docs")
	if err != nil {
		log.Fatal(err)
	}

	router.StaticFS("/public", http.FS(publicFiles))

	// Serve the embedded docs on /docs
	router.GET("/docs", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/docs/")
	})

	// Serve /docs/* from the embedded filesystem
	router.StaticFS("/docs", http.FS(docsFiles))

	routes.RegisterPublicRoutes(router)

	authGroup := router.Group("auth")
	routes.RegisterAuthRoutes(authGroup)

	dashGroup := router.Group("dashboard")
	routes.RegisterDashboardRoutes(dashGroup)

	httpBind := ":" + os.Getenv("PORT")

	srv := &http.Server{
		Addr:    httpBind,
		Handler: router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	wait := gracefulShutdown(context.Background(), 30*time.Second, map[string]operation{
		"gin": func(ctx context.Context) error {
			return srv.Shutdown(ctx)
		},
		"services": func(ctx context.Context) error {
			return services.ShutdownAllServices()
		},
	})

	<-wait
}

func getAllFilenames(fs *embed.FS, dir string) (out []string, err error) {
	if len(dir) == 0 {
		dir = "."
	}

	entries, err := fs.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		fp := path.Join(dir, entry.Name())
		if entry.IsDir() {
			res, err := getAllFilenames(fs, fp)
			if err != nil {
				return nil, err
			}

			out = append(out, res...)

			continue
		}

		out = append(out, fp)
	}

	return
}
