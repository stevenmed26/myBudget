package devlog

import (
	"log"
	"os"
	"strings"
)

func enabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "development")
}

func Debugf(format string, args ...any) {
	if enabled() {
		log.Printf("[DEV] "+format, args...)
	}
}

func Infof(format string, args ...any) {
	if enabled() {
		log.Printf("[DEV] "+format, args...)
	}
}

func Warnf(format string, args ...any) {
	if enabled() {
		log.Printf("[DEV] "+format, args...)
	}
}

func Errorf(format string, args ...any) {
	if enabled() {
		log.Printf("[DEV] "+format, args...)
	}
}
