import { useCallback } from "react";

import { createRecurringRule, deleteRecurringRule, updateRecurringRule } from "../api";
import { devLog } from "../lib/devlog";

export type SaveRecurringRuleInput = {
  ruleID?: string;
  category_id: string;
  name: string;
  amount: string;
  rule_type: "expense" | "income";
  frequency: "weekly" | "biweekly" | "monthly" | "yearly";
  start_date: string;
  end_date?: string | null;
  active?: boolean;
};

export function useRecurringRules({ reload }: { reload: () => Promise<void> }) {
  const saveRecurringRule = useCallback(
    async (input: SaveRecurringRuleInput) => {
      const parsed = Number(input.amount);
      if (!input.category_id || !input.name.trim() || Number.isNaN(parsed) || parsed <= 0) {
        throw new Error("Enter a valid recurring rule");
      }

      const payload = {
        category_id: input.category_id,
        name: input.name.trim(),
        amount_cents: Math.round(parsed * 100),
        rule_type: input.rule_type,
        frequency: input.frequency,
        start_date: input.start_date,
        end_date: input.end_date?.trim() ? input.end_date.trim() : null,
      };

      if (input.ruleID) {
        await updateRecurringRule(input.ruleID, {
          ...payload,
          active: input.active ?? true,
        });
        devLog("recurring rule updated", {
          rule_id: input.ruleID,
          category_id: input.category_id,
          active: input.active ?? true,
        });
      } else {
        const rule = await createRecurringRule(payload);
        devLog("recurring rule created", {
          rule_id: rule.id,
          category_id: rule.category_id,
          frequency: rule.frequency,
        });
      }

      await reload();
    },
    [reload]
  );

  const removeRecurringRule = useCallback(
    async (ruleID: string) => {
      await deleteRecurringRule(ruleID);
      devLog("recurring rule removed", { rule_id: ruleID });
      await reload();
    },
    [reload]
  );

  return { saveRecurringRule, removeRecurringRule };
}
