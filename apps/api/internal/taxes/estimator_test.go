package taxes

import "testing"

func TestEstimateForAnnualIncomeIncludesFICAAndNoIncomeTaxState(t *testing.T) {
	estimate := EstimateForAnnualIncome(7800000, "US-TX")

	if estimate.StateIncomeCents != 0 {
		t.Fatalf("StateIncomeCents = %d, want 0", estimate.StateIncomeCents)
	}
	if estimate.SocialSecurityCents != 483600 {
		t.Fatalf("SocialSecurityCents = %d, want 483600", estimate.SocialSecurityCents)
	}
	if estimate.MedicareCents != 113100 {
		t.Fatalf("MedicareCents = %d, want 113100", estimate.MedicareCents)
	}
	if estimate.FederalIncomeCents <= 0 || estimate.TotalCents <= estimate.FederalIncomeCents {
		t.Fatalf("unexpected estimate: %#v", estimate)
	}
}

func TestPeriodAmountCentsUsesTrackingCadence(t *testing.T) {
	if got := PeriodAmountCents(520000, "weekly"); got != 10000 {
		t.Fatalf("weekly PeriodAmountCents = %d, want 10000", got)
	}
	if got := PeriodAmountCents(1200000, "monthly"); got != 100000 {
		t.Fatalf("monthly PeriodAmountCents = %d, want 100000", got)
	}
}

func TestEstimateForAnnualIncomeIncludesAdditionalMedicare(t *testing.T) {
	estimate := EstimateForAnnualIncome(25000000, "US-TX")

	if estimate.MedicareCents != 407500 {
		t.Fatalf("MedicareCents = %d, want 407500", estimate.MedicareCents)
	}
}
