package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"

	"mybudget-api/internal/db"
)

func main() {
	db.Init("postgres://user:pass@localhost:5432/mybudget")

	r := chi.NewRouter()

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	r.Get("/categories", categories.GetCategories)

	log.Println("API running on :8080")
	http.ListenAndServe(":8080", r)
}
