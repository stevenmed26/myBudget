import { useCallback, useEffect, useState } from "react";
import {
  closeCurrentPeriod,
  createCategory,
  createTransaction,
  deleteCategory,
  deleteTransaction,
  fetchAnalyticsSummary,
  fetchBudgetSuggestions,
  fetchCategories,
  fetchCategoryBudgets,
  fetchHomeSummary,
  fetchProfile,
  fetchTransactions,
  updateProfile,
  upsertCategoryBudget,
  fetchRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
} from "../api";
import { devError, devLog } from "../lib/devlog";
import { todayISO } from "../lib/format";
import {
  AnalyticsSummary,
  BudgetSuggestionsResponse,
  BudgetProfile,
  Category,
  CategoryBudget,
  HomeSummary,
  Transaction,
  RecurringRule,
} from "../types";

export function useAppData(enabled: boolean) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeSummary | null>(null);
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [budgetSuggestions, setBudgetSuggestions] = useState<BudgetSuggestionsResponse | null>(null);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);

  const loadAll = useCallback(async () => {
    if (!enabled) return;

    const txs = await fetchTransactions();

    const [cats, home, prof, budgetItems, analyticsSummary, suggestions, recurringItems] =
      await Promise.all([
        fetchCategories(),
        fetchHomeSummary(),
        fetchProfile(),
        fetchCategoryBudgets(),
        fetchAnalyticsSummary(),
        fetchBudgetSuggestions(),
        fetchRecurringRules(),
      ]);

    setCategories(cats);
    setTransactions(txs);
    setHomeSummary(home);
    setProfile(prof);
    setBudgets(budgetItems);
    setAnalytics(analyticsSummary);
    setBudgetSuggestions(suggestions);
    setRecurringRules(recurringItems);
  }, [enabled]);

  async function addExpense(input: {
    category_id: string;
    amount: string;
    merchant_name: string;
    note: string;
    is_recurring?: boolean;
    frequency?: "weekly" | "biweekly" | "monthly" | "yearly";
    start_date?: string;
  }) {
    const parsed = Number(input.amount);
    if (!input.category_id || Number.isNaN(parsed) || parsed <= 0) {
      throw new Error("Enter a valid category and amount");
    }

    if (input.is_recurring) {
      const category = categories.find((item) => item.id === input.category_id);
      const name = input.merchant_name.trim() || input.note.trim() || category?.name || "Recurring expense";

      await createRecurringRule({
        category_id: input.category_id,
        name,
        amount_cents: Math.round(parsed * 100),
        rule_type: "expense",
        frequency: input.frequency ?? "monthly",
        start_date: input.start_date?.trim() || todayISO(),
        end_date: null,
      });
      devLog("recurring expense created", {
        category_id: input.category_id,
        frequency: input.frequency ?? "monthly",
        start_date: input.start_date?.trim() || todayISO(),
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

    await loadAll();
  }

  async function saveRecurringRule(input: {
    ruleID?: string;
    category_id: string;
    name: string;
    amount: string;
    rule_type: "expense" | "income";
    frequency: "weekly" | "biweekly" | "monthly" | "yearly";
    start_date: string;
    end_date?: string | null;
    active?: boolean;
  }) {
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

    await loadAll();
  }

  async function removeRecurringRule(ruleID: string) {
    await deleteRecurringRule(ruleID);
    devLog("recurring rule removed", { rule_id: ruleID });
    await loadAll();
  }

  async function removeTransaction(transactionID: string) {
    await deleteTransaction(transactionID);
    await loadAll();
  }

  async function saveBudget(
    categoryID: string,
    amount: string,
    cadence: "weekly" | "monthly" | "yearly"
  ) {
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

    await loadAll();
  }

  async function addCategory(input: {
    name: string;
    color: string;
    amount: string;
    cadence: "weekly" | "monthly" | "yearly";
  }) {
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

    await loadAll();
  }

  async function removeCategory(categoryID: string) {
    await deleteCategory(categoryID);
    devLog("category removed", { category_id: categoryID });
    await loadAll();
  }

  async function saveProfile(input: {
    incomeAmount: string;
    taxRate: string;
    trackingCadence: "weekly" | "monthly";
    smartBudgetingEnabled: boolean;
  }) {
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

    await loadAll();
  }

  async function closePeriod() {
    const result = await closeCurrentPeriod();
    devLog("period close requested", {
      period_start: result.period_start,
      period_end: result.period_end,
      already_closed: result.already_closed,
    });
    await loadAll();
    return result;
  }

  useEffect(() => {
    if (!enabled) return;

    loadAll().catch((err) => {
      devError("useAppData loadAll failed", err);
    });
  }, [enabled, loadAll]);

  return {
    categories,
    transactions,
    budgets,
    homeSummary,
    profile,
    analytics,
    budgetSuggestions,
    loadAll,
    addExpense,
    removeTransaction,
    addCategory,
    removeCategory,
    saveBudget,
    saveProfile,
    closePeriod,
    recurringRules,
    saveRecurringRule,
    removeRecurringRule,
  };
}
