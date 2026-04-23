import { useCallback } from "react";

import { createCategory, deleteCategory, upsertCategoryBudget } from "../api";
import { devLog } from "../lib/devlog";
import { todayISO } from "../lib/format";

export type AddCategoryInput = {
  name: string;
  color: string;
  amount: string;
  cadence: "weekly" | "monthly" | "yearly";
};

export function useCategories({ reload }: { reload: () => Promise<void> }) {
  const saveBudget = useCallback(
    async (
      categoryID: string,
      amount: string,
      cadence: "weekly" | "monthly" | "yearly"
    ) => {
      const parsed = Number(amount);
      if (Number.isNaN(parsed) || parsed < 0) {
        throw new Error("Budget must be zero or greater");
      }

      await upsertCategoryBudget({
        category_id: categoryID,
        amount_cents: Math.round(parsed * 100),
        cadence,
        effective_from: todayISO(),
      });

      await reload();
    },
    [reload]
  );

  const addCategory = useCallback(
    async (input: AddCategoryInput) => {
      const name = input.name.trim();
      const color = input.color.trim();
      const parsed = Number(input.amount || "0");

      if (!name) {
        throw new Error("Category name is required");
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new Error("Enter a valid hex color");
      }
      if (Number.isNaN(parsed) || parsed < 0) {
        throw new Error("Budget must be zero or greater");
      }

      const category = await createCategory({
        name,
        color,
        icon: null,
        counts_toward_budget: true,
      });
      devLog("category created", {
        category_id: category.id,
        name: category.name,
      });

      await upsertCategoryBudget({
        category_id: category.id,
        amount_cents: Math.round(parsed * 100),
        cadence: input.cadence,
        effective_from: todayISO(),
      });

      await reload();
    },
    [reload]
  );

  const removeCategory = useCallback(
    async (categoryID: string) => {
      await deleteCategory(categoryID);
      devLog("category removed", { category_id: categoryID });
      await reload();
    },
    [reload]
  );

  return { addCategory, removeCategory, saveBudget };
}
