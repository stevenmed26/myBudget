package recurring

import "testing"

func TestAdvanceDateMonthlyUsesAnchorDayOrLastDay(t *testing.T) {
	tests := []struct {
		name        string
		currentDate string
		anchorDate  string
		want        string
	}{
		{
			name:        "month end anchor stays on month end",
			currentDate: "2026-01-31",
			anchorDate:  "2026-01-31",
			want:        "2026-02-28",
		},
		{
			name:        "month end anchor returns to 31 when available",
			currentDate: "2026-02-28",
			anchorDate:  "2026-01-31",
			want:        "2026-03-31",
		},
		{
			name:        "thirtieth anchor does not drift after February",
			currentDate: "2026-02-28",
			anchorDate:  "2026-01-30",
			want:        "2026-03-30",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := advanceDate(tt.currentDate, "monthly", tt.anchorDate)
			if err != nil {
				t.Fatalf("advanceDate() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("advanceDate() = %s, want %s", got, tt.want)
			}
		})
	}
}
