package server

import (
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
	"mybudget-api/internal/onboarding"
	"mybudget-api/internal/periodclose"
	"mybudget-api/internal/profile"
	"mybudget-api/internal/recommendations"
	"mybudget-api/internal/recurring"
	"mybudget-api/internal/transactions"
)

type Dependencies struct {
	AuthHandler            *auth.Handler
	CategoryHandler        *categories.Handler
	TransactionHandler     *transactions.Handler
	RecurringHandler       *recurring.Handler
	DashboardHandler       *dashboard.Handler
	ProfileHandler         *profile.Handler
	CategoryBudgetHandler  *categorybudgets.Handler
	HomeHandler            *home.Handler
	PeriodCloseHandler     *periodclose.Handler
	AnalyticsHandler       *analytics.Handler
	RecommendationsHandler *recommendations.Handler
	OnboardingHandler      *onboarding.Handler
}

func NewDependencies(database *db.DB, cfg config.Config) Dependencies {
	authRepo := auth.NewRepository(database)
	authService := auth.NewService(authRepo, cfg)

	categoryRepo := categories.NewRepository(database)
	profileRepo := profile.NewRepository(database)
	transactionRepo := transactions.NewRepository(database)

	recurringRepo := recurring.NewRepository(database)
	recurringService := recurring.NewService(recurringRepo, profileRepo)

	dashboardRepo := dashboard.NewRepository(database)
	categoryBudgetRepo := categorybudgets.NewRepository(database)

	homeRepo := home.NewRepository(database)
	homeService := home.NewService(homeRepo, profileRepo)

	periodCloseRepo := periodclose.NewRepository(database)
	periodCloseService := periodclose.NewService(periodCloseRepo, homeService)

	analyticsRepo := analytics.NewRepository(database)
	recommendationsRepo := recommendations.NewRepository(database)
	onboardingRepo := onboarding.NewRepository(database)

	return Dependencies{
		AuthHandler:            auth.NewHandler(authService, authRepo),
		CategoryHandler:        categories.NewHandler(categoryRepo),
		TransactionHandler:     transactions.NewHandler(transactionRepo, categoryRepo, profileRepo, recurringService),
		RecurringHandler:       recurring.NewHandler(recurringRepo, recurringService, categoryRepo),
		DashboardHandler:       dashboard.NewHandler(dashboardRepo, profileRepo),
		ProfileHandler:         profile.NewHandler(profileRepo),
		CategoryBudgetHandler:  categorybudgets.NewHandler(categoryBudgetRepo, categoryRepo),
		HomeHandler:            home.NewHandler(homeService, recurringService),
		PeriodCloseHandler:     periodclose.NewHandler(periodCloseService),
		AnalyticsHandler:       analytics.NewHandler(analyticsRepo, recurringService),
		RecommendationsHandler: recommendations.NewHandler(recommendationsRepo, profileRepo, recurringService),
		OnboardingHandler:      onboarding.NewHandler(onboardingRepo),
	}
}

func NewRouter(cfg config.Config, deps Dependencies) http.Handler {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
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
			r.Post("/register", deps.AuthHandler.Register)
			r.Post("/login", deps.AuthHandler.Login)
			r.Post("/refresh", deps.AuthHandler.Refresh)
			r.Post("/verify-email", deps.AuthHandler.VerifyEmail)
			r.Post("/resend-verification", deps.AuthHandler.ResendVerification)

			r.With(auth.RequireAuth(cfg.JWTAccessSecret)).Get("/me", deps.AuthHandler.Me)
		})

		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAuth(cfg.JWTAccessSecret))

			r.Get("/onboarding/status", deps.OnboardingHandler.Status)
			r.Post("/onboarding/submit", deps.OnboardingHandler.Submit)

			r.Get("/categories", deps.CategoryHandler.List)
			r.Post("/categories", deps.CategoryHandler.Create)
			r.Delete("/categories/{categoryID}", deps.CategoryHandler.Delete)

			r.Get("/transactions", deps.TransactionHandler.List)
			r.Post("/transactions", deps.TransactionHandler.Create)
			r.Put("/transactions/{transactionID}", deps.TransactionHandler.Update)
			r.Delete("/transactions/{transactionID}", deps.TransactionHandler.Delete)

			r.Get("/recurring-rules", deps.RecurringHandler.List)
			r.Post("/recurring-rules", deps.RecurringHandler.Create)
			r.Put("/recurring-rules/{ruleID}", deps.RecurringHandler.Update)
			r.Delete("/recurring-rules/{ruleID}", deps.RecurringHandler.Delete)

			r.Get("/dashboard/summary", deps.DashboardHandler.Summary)

			r.Get("/profile", deps.ProfileHandler.Get)
			r.Put("/profile", deps.ProfileHandler.Update)

			r.Get("/category-budgets", deps.CategoryBudgetHandler.List)
			r.Post("/category-budgets", deps.CategoryBudgetHandler.Upsert)

			r.Get("/home/summary", deps.HomeHandler.Summary)
			r.Post("/periods/close-current", deps.PeriodCloseHandler.CloseCurrent)

			r.Get("/analytics/summary", deps.AnalyticsHandler.Summary)
			r.Get("/recommendations/budget-suggestions", deps.RecommendationsHandler.BudgetSuggestions)
		})
	})

	return r
}
