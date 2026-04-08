package money

import (
	"fmt"
	"math"
)

func DollarsToCents(amount float64) int64 {
	return int64(math.Round(amount * 100))
}

func CentsToDollars(cents int64) float64 {
	return float64(cents) / 100.0
}

func FormatUSD(cents int64) string {
	sign := ""
	if cents < 0 {
		sign = "-"
		cents = -cents
	}
	dollars := cents / 100
	remainder := cents % 100
	return fmt.Sprintf("%s$%d.%02d", sign, dollars, remainder)
}
