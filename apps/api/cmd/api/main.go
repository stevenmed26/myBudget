package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"mybudget-api/internal/categories"
	"mybudget-api/internal/categorybudgets"
	"mybudget-api/internal/config"
	"mybudget-api/internal/dashboard"
	"mybudget-api/internal/db"
	"mybudget-api/internal/home"
	"mybudget-api/internal/httpx"
	"mybudget-api/internal/periodclose"
	"mybudget-api/internal/profile"
	"mybudget-api/internal/transactions"
)

func main() {
	cfg := config.Load()
	database := db.New(cfg.DatabaseURL)

	categoryRepo := categories.NewRepository(database)
	categoryHandler := categories.NewHandler(categoryRepo, cfg.DemoUserID)

	transactionRepo := transactions.NewRepository(database)
	transactionHandler := transactions.NewHandler(transactionRepo, cfg.DemoUserID)

	dashboardRepo := dashboard.NewRepository(database)
	dashboardHandler := dashboard.NewHandler(dashboardRepo, cfg.DemoUserID)

	profileRepo := profile.NewRepository(database)
	profileHandler := profile.NewHandler(profileRepo, cfg.DemoUserID)

	categoryBudgetRepo := categorybudgets.NewRepository(database)
	categoryBudgetHandler := categorybudgets.NewHandler(categoryBudgetRepo, cfg.DemoUserID)

	homeRepo := home.NewRepository(database)
	homeService := home.NewService(homeRepo, cfg.DemoUserID)
	homeHandler := home.NewHandler(homeService)

	periodCloseRepo := periodclose.NewRepository(database)
	periodCloseService := periodclose.NewService(periodCloseRepo, homeService, cfg.DemoUserID)
	periodCloseHandler := periodclose.NewHandler(periodCloseService)

	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]string{
			"status": "ok",
		})
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/categories", categoryHandler.List)
		r.Post("/categories", categoryHandler.Create)

		r.Get("/transactions", transactionHandler.List)
		r.Post("/transactions", transactionHandler.Create)
		r.Delete("/transactions/{transactionID}", transactionHandler.Delete)

		r.Get("/dashboard/summary", dashboardHandler.Summary)

		r.Get("/profile", profileHandler.Get)
		r.Put("/profile", profileHandler.Update)

		r.Get("/category-budgets", categoryBudgetHandler.List)
		r.Post("/category-budgets", categoryBudgetHandler.Upsert)

		r.Get("/home/summary", homeHandler.Summary)

		r.Post("/periods/close-current", periodCloseHandler.CloseCurrent)
	})

	addr := ":" + cfg.APIPort
	log.Printf("myBudget API running on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}
