package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"mybudget-api/internal/analytics"
	"mybudget-api/internal/auth"
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
	"mybudget-api/internal/onboarding"
)

func main() {
	cfg := config.Load()
	database := db.New(cfg.DatabaseURL)

	authRepo := auth.NewRepository(database)
	authService := auth.NewService(authRepo, cfg)
	authHandler := auth.NewHandler(authService, authRepo)

	categoryRepo := categories.NewRepository(database)
	categoryHandler := categories.NewHandler(categoryRepo)

	profileRepo := profile.NewRepository(database)
	profileHandler := profile.NewHandler(profileRepo)

	transactionRepo := transactions.NewRepository(database)
	transactionHandler := transactions.NewHandler(transactionRepo, categoryRepo)

	dashboardRepo := dashboard.NewRepository(database)
	dashboardHandler := dashboard.NewHandler(dashboardRepo, profileRepo)

	categoryBudgetRepo := categorybudgets.NewRepository(database)
	categoryBudgetHandler := categorybudgets.NewHandler(categoryBudgetRepo, categoryRepo)

	homeRepo := home.NewRepository(database)
	homeService := home.NewService(homeRepo, profileRepo)
	homeHandler := home.NewHandler(homeService)

	periodCloseRepo := periodclose.NewRepository(database)
	periodCloseService := periodclose.NewService(periodCloseRepo, homeService)
	periodCloseHandler := periodclose.NewHandler(periodCloseService)

	analyticsRepo := analytics.NewRepository(database)
	analyticsHandler := analytics.NewHandler(analyticsRepo)

	onboardingRepo := onboarding.NewRepository(database)
	onboardingHandler := onboarding.NewHandler(onboardingRepo)

	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)

			r.With(auth.RequireAuth(cfg.JWTAccessSecret)).Get("/me", authHandler.Me)
		})

		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAuth(cfg.JWTAccessSecret))

			r.Get("/onboarding/status", onboardingHandler.Status)
			r.Post("/onboarding/submit", onboardingHandler.Submit)

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

			r.Get("/analytics/summary", analyticsHandler.Summary)
		})
	})

	addr := ":" + cfg.APIPort
	log.Printf("myBudget API running on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}