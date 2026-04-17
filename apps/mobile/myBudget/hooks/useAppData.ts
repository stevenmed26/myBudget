import { useCallback, useEffect, useState } from "react";
import {
  closeCurrentPeriod,
  createTransaction,
  deleteTransaction,
  fetchAnalyticsSummary,
  fetchCategories,
  fetchCategoryBudgets,
  fetchHomeSummary,
  fetchProfile,
  fetchTransactions,
  updateProfile,
  upsertCategoryBudget,
} from "../api";
import { todayISO } from "../lib/format";
import {
  AnalyticsSummary,
  BudgetProfile,
  Category,
  CategoryBudget,
  HomeSummary,
  Transaction,
} from "../types";

export function useAppData(enabled: boolean) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeSummary | null>(null);
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  const loadAll = useCallback(async () => {
    if (!enabled) return;

    const [cats, txs, home, prof, budgetItems, analyticsSummary] = await Promise.all([
      fetchCategories(),
      fetchTransactions(),
      fetchHomeSummary(),
      fetchProfile(),
      fetchCategoryBudgets(),
      fetchAnalyticsSummary(),
    ]);

    setCategories(cats);
    setTransactions(txs);
    setHomeSummary(home);
    setProfile(prof);
    setBudgets(budgetItems);
    setAnalytics(analyticsSummary);
  }, [enabled]);

  async function addExpense(input: {
    category_id: string;
    amount: string;
    merchant_name: string;
    note: string;
  }) {
    const parsed = Number(input.amount);
    if (!input.category_id || Number.isNaN(parsed) || parsed <= 0) {
      throw new Error("Enter a valid category and amount");
    }

    await createTransaction({
      category_id: input.category_id,
      amount_cents: Math.round(parsed * 100),
      transaction_type: "expense",
      transaction_date: todayISO(),
      merchant_name: input.merchant_name || undefined,
      note: input.note || undefined,
    });

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

  async function saveProfile(input: {
    incomeAmount: string;
    taxRate: string;
    trackingCadence: "weekly" | "monthly";
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
    });

    await loadAll();
  }

  async function closePeriod() {
    const result = await closeCurrentPeriod();
    await loadAll();
    return result;
  }

  useEffect(() => {
    if (!enabled) return;

    loadAll().catch((err) => {
      console.error("useAppData loadAll failed", err);
    });
  }, [enabled, loadAll]);

  return {
    categories,
    transactions,
    budgets,
    homeSummary,
    profile,
    analytics,
    loadAll,
    addExpense,
    removeTransaction,
    saveBudget,
    saveProfile,
    closePeriod,
  };
}
