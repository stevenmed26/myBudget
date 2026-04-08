package categories

import (
	"encoding/json"
	"net/http"
)

type Category struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

func GetCategories(w http.ResponseWriter, r *http.Request) {
	cats := []Category{
		{ID: "1", Name: "Food", Color: "#FF5733"},
	}

	json.NewEncoder(w).Encode(cats)
}
