package httpx

import (
	"log"
	"net/http"
)

func WriteInternalError(w http.ResponseWriter, logPrefix string, err error, publicMessage string) {
	if err != nil {
		log.Printf("%s: %v", logPrefix, err)
	} else {
		log.Printf("%s", logPrefix)
	}

	if publicMessage == "" {
		publicMessage = "internal server error"
	}

	WriteError(w, http.StatusInternalServerError, publicMessage)
}