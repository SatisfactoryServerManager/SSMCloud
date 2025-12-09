package utils

import "encoding/json"

func ToJSON(a interface{}) string {
	bytes, _ := json.Marshal(a)
	return string(bytes)
}
