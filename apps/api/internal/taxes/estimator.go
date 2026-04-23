package taxes

import (
	"math"
	"strings"
)

const (
	socialSecurityRateBps = 620
	medicareRateBps       = 145
	additionalMedicareBps = 90
	socialSecurityWageMax = int64(18450000)
	additionalMedicareMin = int64(20000000)
	standardDeduction     = int64(1610000)
)

type Estimate struct {
	FederalIncomeCents  int64
	StateIncomeCents    int64
	SocialSecurityCents int64
	MedicareCents       int64
	TotalCents          int64
	EffectiveRateBps    int
}

type bracket struct {
	overCents int64
	rateBps   int
}

var federalSingleBrackets = []bracket{
	{overCents: 0, rateBps: 1000},
	{overCents: 1240000, rateBps: 1200},
	{overCents: 5040000, rateBps: 2200},
	{overCents: 10570000, rateBps: 2400},
	{overCents: 20177500, rateBps: 3200},
	{overCents: 25622500, rateBps: 3500},
	{overCents: 64060000, rateBps: 3700},
}

var stateFlatRateBps = map[string]int{
	"AK": 0, "FL": 0, "NV": 0, "NH": 0, "SD": 0, "TN": 0, "TX": 0, "WA": 0, "WY": 0,
	"AL": 500, "AZ": 250, "AR": 390, "CA": 600, "CO": 440, "CT": 500, "DC": 650,
	"DE": 520, "GA": 539, "HI": 640, "IA": 380, "ID": 530, "IL": 495, "IN": 305,
	"KS": 520, "KY": 400, "LA": 300, "MA": 500, "MD": 475, "ME": 580, "MI": 425,
	"MN": 680, "MO": 470, "MS": 440, "MT": 470, "NC": 399, "ND": 200, "NE": 520,
	"NJ": 550, "NM": 490, "NY": 585, "OH": 350, "OK": 400, "OR": 875, "PA": 307,
	"RI": 475, "SC": 600, "UT": 455, "VA": 575, "VT": 660, "WI": 530, "WV": 410,
}

func EstimateForAnnualIncome(annualIncomeCents int64, locationCode string) Estimate {
	if annualIncomeCents <= 0 {
		return Estimate{}
	}

	federalTaxable := maxInt64(0, annualIncomeCents-standardDeduction)
	federal := progressiveTax(federalTaxable, federalSingleBrackets)
	state := taxAtRate(annualIncomeCents, stateRateBps(locationCode))
	socialSecurity := taxAtRate(minInt64(annualIncomeCents, socialSecurityWageMax), socialSecurityRateBps)
	medicare := taxAtRate(annualIncomeCents, medicareRateBps)
	medicare += taxAtRate(maxInt64(0, annualIncomeCents-additionalMedicareMin), additionalMedicareBps)
	total := federal + state + socialSecurity + medicare

	return Estimate{
		FederalIncomeCents:  federal,
		StateIncomeCents:    state,
		SocialSecurityCents: socialSecurity,
		MedicareCents:       medicare,
		TotalCents:          total,
		EffectiveRateBps:    int(math.Round(float64(total) / float64(annualIncomeCents) * 10000)),
	}
}

func AnnualizeIncome(amountCents int64, cadence string) int64 {
	switch cadence {
	case "weekly":
		return amountCents * 52
	case "biweekly":
		return amountCents * 26
	case "yearly":
		return amountCents
	default:
		return amountCents * 12
	}
}

func PeriodAmountCents(annualAmountCents int64, trackingCadence string) int64 {
	if annualAmountCents <= 0 {
		return 0
	}
	divisor := int64(12)
	if trackingCadence == "weekly" {
		divisor = 52
	}
	return int64(math.Round(float64(annualAmountCents) / float64(divisor)))
}

func RecurringFrequency(trackingCadence string) string {
	if trackingCadence == "monthly" {
		return "monthly"
	}
	return "weekly"
}

func stateRateBps(locationCode string) int {
	state := strings.ToUpper(strings.TrimSpace(locationCode))
	if strings.HasPrefix(state, "US-") {
		state = strings.TrimPrefix(state, "US-")
	}
	if len(state) > 2 {
		state = state[:2]
	}
	return stateFlatRateBps[state]
}

func progressiveTax(taxableCents int64, brackets []bracket) int64 {
	var total int64
	for i, current := range brackets {
		next := taxableCents
		if i+1 < len(brackets) {
			next = minInt64(taxableCents, brackets[i+1].overCents)
		}
		if next <= current.overCents {
			continue
		}
		total += taxAtRate(next-current.overCents, current.rateBps)
	}
	return total
}

func taxAtRate(amountCents int64, rateBps int) int64 {
	return int64(math.Round(float64(amountCents) * float64(rateBps) / 10000))
}

func minInt64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}

func maxInt64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
