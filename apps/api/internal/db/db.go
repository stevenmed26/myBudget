package db

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"mybudget-api/internal/devlog"
)

type DB struct {
	Pool *pgxpool.Pool
}

func New(databaseURL string) *DB {
	devlog.Infof("db: parsing pool config")
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatalf("parse db config: %v", err)
	}

	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 10 * time.Minute
	cfg.HealthCheckPeriod = 30 * time.Second

	devlog.Debugf(
		"db: pool config max_conns=%d min_conns=%d max_lifetime=%s max_idle=%s health_check=%s",
		cfg.MaxConns,
		cfg.MinConns,
		cfg.MaxConnLifetime,
		cfg.MaxConnIdleTime,
		cfg.HealthCheckPeriod,
	)

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		log.Fatalf("create db pool: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	devlog.Infof("db: database ping successful")
	return &DB{Pool: pool}
}
