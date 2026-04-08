package periods

import (
	"time"
)

type CurrentPeriod struct {
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Cadence   string `json:"cadence"`
}

func GetCurrentPeriod(now time.Time, cadence string, weekStartsOn int, monthlyAnchorDay int) CurrentPeriod {
	switch cadence {
	case "monthly":
		return currentMonthly(now, monthlyAnchorDay)
	default:
		return currentWeekly(now, weekStartsOn)
	}
}

func currentWeekly(now time.Time, weekStartsOn int) CurrentPeriod {
	currentWeekday := int(now.Weekday())
	diff := ((currentWeekday - weekStartsOn) + 7) % 7

	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, -diff)
	end := start.AddDate(0, 0, 6)

	return CurrentPeriod{
		StartDate: start.Format("2006-01-02"),
		EndDate:   end.Format("2006-01-02"),
		Cadence:   "weekly",
	}
}

func currentMonthly(now time.Time, anchorDay int) CurrentPeriod {
	year, month, day := now.Date()
	loc := now.Location()

	if day < anchorDay {
		month = month - 1
		if month < time.January {
			month = time.December
			year--
		}
	}

	start := time.Date(year, month, anchorDay, 0, 0, 0, 0, loc)
	end := start.AddDate(0, 1, 0).AddDate(0, 0, -1)

	return CurrentPeriod{
		StartDate: start.Format("2006-01-02"),
		EndDate:   end.Format("2006-01-02"),
		Cadence:   "monthly",
	}
}
