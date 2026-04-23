package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"mybudget-api/internal/config"
	"mybudget-api/internal/db"
	"mybudget-api/internal/server"
)

func main() {
	cfg := config.Load()

	database := db.New(cfg.DatabaseURL)
	if err := database.RunMigrations(context.Background()); err != nil {
		log.Fatalf("run migrations: %v", err)
	}

	r := server.NewRouter(cfg, server.NewDependencies(database, cfg))

	addr := ":" + cfg.APIPort
	log.Printf("myBudget API running on %s", addr)
	server := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Fatal(server.ListenAndServe())
}
