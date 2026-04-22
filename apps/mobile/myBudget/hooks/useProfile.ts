import { useCallback } from "react";

import { updateProfile } from "../api";
import { devLog } from "../lib/devlog";
import { BudgetProfile } from "../types";

export type SaveProfileInput = {
  incomeAmount: string;
  taxRate: string;
  trackingCadence: "weekly" | "monthly";
  smartBudgetingEnabled: boolean;
};

export function useProfile({
  profile,
  reload,
}: {
  profile: BudgetProfile | null;
  reload: () => Promise<void>;
}) {
  const saveProfile = useCallback(
    async (input: SaveProfileInput) => {
      if (!profile) {
        throw new Error("Profile not loaded");
      }

      const incomeParsed = Number(input.incomeAmount);
      const taxParsed = Number(input.taxRate);

      if (Number.isNaN(incomeParsed) || incomeParsed < 0) {
        throw new Error("Income must be zero or greater");
      }
      if (Number.isNaN(taxParsed) || taxParsed < 0 || taxParsed > 100) {
        throw new Error("Tax rate must be between 0 and 100");
      }

      await updateProfile({
        tracking_cadence: input.trackingCadence,
        week_starts_on: profile.week_starts_on,
        monthly_anchor_day: profile.monthly_anchor_day,
        currency_code: profile.currency_code,
        locale: profile.locale,
        timezone: profile.timezone,
        income_amount_cents: Math.round(incomeParsed * 100),
        income_cadence: profile.income_cadence,
        location_code: profile.location_code,
        estimated_tax_rate_bps: Math.round(taxParsed * 100),
        smart_budgeting_enabled: input.smartBudgetingEnabled,
      });
      devLog("profile updated", {
        tracking_cadence: input.trackingCadence,
        smart_budgeting_enabled: input.smartBudgetingEnabled,
      });

      await reload();
    },
    [profile, reload]
  );

  return { saveProfile };
}
