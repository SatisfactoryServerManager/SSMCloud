package main

import (
	"bytes"
	"fmt"
	"html/template"
	"math"
	"strings"
	"testing"
	"time"

	pbModels "github.com/SatisfactoryServerManager/ssmcloud-resources/proto/generated/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func testTemplates(t *testing.T) *template.Template {
	t.Helper()
	tmpl := template.New("").Funcs(template.FuncMap{
		"dict": func(values ...interface{}) (map[string]interface{}, error) {
			if len(values)%2 != 0 {
				return nil, fmt.Errorf("invalid dict call")
			}
			m := make(map[string]interface{}, len(values)/2)
			for i := 0; i < len(values); i += 2 {
				m[values[i].(string)] = values[i+1]
			}
			return m, nil
		},
		"RoundTo": func(value float32, digits int) float64 {
			factor := math.Pow(10, float64(digits))
			return math.Round(float64(value)*factor) / factor
		},
		// Only needed so the whole template set parses; not exercised below.
		"formatDate":      func(t time.Time) string { return t.String() },
		"formatDatePb":    func(t *timestamppb.Timestamp) string { return t.AsTime().String() },
		"OIDtoString":     func(id bson.ObjectID) string { return id.Hex() },
		"toBytes":         func(size int64) string { return fmt.Sprintf("%d Bytes", size) },
		"displayLogLines": func(lines []string) []string { return lines },
		"shortenApikey":   func(prefix, apikey string) string { return prefix },
		"toJson":          func(v interface{}) template.JS { return template.JS("{}") },
		"toJsonPretty":    func(v interface{}) template.JS { return template.JS("{}") },
	})
	// Same globs main.go uses, read straight off disk.
	tmpl, err := tmpl.ParseGlob("templates/includes/**/*.tmpl")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	return tmpl
}

// The bug this guards: server-card read .ModConfig.SelectedMods, a field pb.Agent
// no longer has. html/template resolves fields at render time, so build and vet
// were both clean and only an actual render caught it.
func TestServerCardRendersAgainstRealAgentProto(t *testing.T) {
	tmpl := testTemplates(t)

	cases := []struct {
		name string
		mods int32
		want string
	}{
		{"with mods", 3, ">3<"},
		{"zero mods", 0, ">0<"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			agent := &pbModels.Agent{
				Id:        "68f0d3b2c1a4e59f7b2d1a01",
				AgentName: "Test Server",
				ModCount:  tc.mods,
				Status: &pbModels.AgentStatus{
					Online: true, Running: true, Installed: true,
					Cpu: 42.4, Ram: 91.2,
				},
			}

			var buf bytes.Buffer
			if err := tmpl.ExecuteTemplate(&buf, "includes/dashboard/server-card", agent); err != nil {
				t.Fatalf("render failed: %v", err)
			}

			out := buf.String()
			if !strings.Contains(out, tc.want) {
				t.Errorf("mod count %q not rendered in output:\n%s", tc.want, out)
			}
			if !strings.Contains(out, "Test Server") {
				t.Errorf("agent name missing from output")
			}
		})
	}
}
