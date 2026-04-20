package httpx

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"mybudget-api/internal/devlog"
)

func WriteJSON(w http.ResponseWriter, status int, value any) {
	devlog.Debugf("httpx: writing json status=%d type %T", status, value)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func WriteError(w http.ResponseWriter, status int, message string) {
	devlog.Warnf("httpx: writing error status=%d message=%s", status, message)
	WriteJSON(w, status, map[string]string{"error": message})
}

func DecodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()

	devlog.Debugf("httpx: decoding json method=%s path=%s into=%T", r.Method, r.URL.Path, dst)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dst); err != nil {
		devlog.Warnf("httpx: decode failed method=%s path=%s err=%v", r.Method, r.URL.Path, err)
		return err
	}

	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		devlog.Warnf("httpx: extra json payload detected method=%s path=%s", r.Method, r.URL.Path)
		return fmt.Errorf("request body must contain only one JSON object")
	}

	devlog.Debugf("httpx: decode success method=%s path=%s", r.Method, r.URL.Path)
	return nil
}
