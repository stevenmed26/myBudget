import { useCallback } from "react";

import { createRecurringRule, createTransaction, deleteTransaction } from "../api";
import { devLog } from "../lib/devlog";
import { todayISO } from "../lib/format";
import { Category } from "../types";

export type AddExpenseInput = {
  category_id: string;
  amount: string;
  merchant_name: string;
  note: string;
  is_recurring?: boolean;
  frequency?: "weekly" | "biweekly" | "monthly" | "yearly";
  start_date?: string;
};

export function useTransactions({
  categories,
  reload,
}: {
  categories: Category[];
  reload: () => Promise<void>;
}) {
  const addExpense = useCallback(
    async (input: AddExpenseInput) => {
      const parsed = Number(input.amount);
      if (!input.category_id || Number.isNaN(parsed) || parsed <= 0) {
        throw new Error("Enter a valid category and amount");
      }

      if (input.is_recurring) {
        const category = categories.find((item) => item.id === input.category_id);
        const name =
          input.merchant_name.trim() ||
          input.note.trim() ||
          category?.name ||
          "Recurring expense";
        const startDate = input.start_date?.trim() || todayISO();

        await createRecurringRule({
          category_id: input.category_id,
          name,
          amount_cents: Math.round(parsed * 100),
          rule_type: "expense",
          frequency: input.frequency ?? "monthly",
          start_date: startDate,
          end_date: null,
        });
        devLog("recurring expense created", {
          category_id: input.category_id,
          frequency: input.frequency ?? "monthly",
          start_date: startDate,
        });
      } else {
        await createTransaction({
          category_id: input.category_id,
          amount_cents: Math.round(parsed * 100),
          transaction_type: "expense",
          transaction_date: todayISO(),
          merchant_name: input.merchant_name || undefined,
          note: input.note || undefined,
        });
      }

      await reload();
    },
    [categories, reload]
  );

  const removeTransaction = useCallback(
    async (transactionID: string) => {
      await deleteTransaction(transactionID);
      await reload();
    },
    [reload]
  );

  return { addExpense, removeTransaction };
}
