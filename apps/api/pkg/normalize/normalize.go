package normalize

import (
	"fmt"
)

type Cadence string

const (
	Weekly   Cadence = "weekly"
	Biweekly Cadence = "biweekly"
	Monthly  Cadence = "monthly"
	Yearly   Cadence = "yearly"
)

func ConvertAmount(amountCents int64, from Cadence, to Cadence) (int64, error) {
	if from == to {
		return amountCents, nil
	}
	yearly, err := toYearly(amountCents, from)
	if err != nil {
		return 0, err
	}

	return fromYearly(yearly, to)
}

func toYearly(amountCents int64, from Cadence) (int64, error) {
	switch from {
	case Weekly:
		return amountCents * 52, nil
	case Biweekly:
		return amountCents * 26, nil
	case Monthly:
		return amountCents * 12, nil
	case Yearly:
		return amountCents, nil
	default:
		return 0, fmt.Errorf("unsupported cadence: %s", from)
	}
}

func fromYearly(yearlyCents int64, to Cadence) (int64, error) {
	switch to {
	case Weekly:
		return yearlyCents / 52, nil
	case Biweekly:
		return yearlyCents / 26, nil
	case Monthly:
		return yearlyCents / 12, nil
	case Yearly:
		return yearlyCents, nil
	default:
		return 0, fmt.Errorf("unsupported cadence: %s", to)
	}
}
