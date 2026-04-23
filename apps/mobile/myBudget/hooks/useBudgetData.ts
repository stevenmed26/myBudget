import { useCallback, useEffect, useState } from "react";

import {
  fetchAnalyticsSummary,
  fetchBudgetSuggestions,
  fetchCategories,
  fetchCategoryBudgets,
  fetchHomeSummary,
  fetchProfile,
  fetchRecurringRules,
  fetchTransactions,
} from "../api";
import { devError, devWarn } from "../lib/devlog";
import {
  AnalyticsSummary,
  BudgetProfile,
  BudgetSuggestionsResponse,
  Category,
  CategoryBudget,
  HomeSummary,
  RecurringRule,
  Transaction,
} from "../types";

export function useBudgetData(enabled: boolean) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeSummary | null>(null);
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [budgetSuggestions, setBudgetSuggestions] =
    useState<BudgetSuggestionsResponse | null>(null);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);

  const loadAll = useCallback(async () => {
    if (!enabled) return;

    const [txs, prof] = await Promise.all([fetchTransactions(), fetchProfile()]);

    const suggestionsPromise = prof.smart_budgeting_enabled
      ? fetchBudgetSuggestions().catch((err) => {
          devWarn("budget suggestions load failed", err);
          return null;
        })
      : Promise.resolve(null);

    const [cats, home, budgetItems, analyticsSummary, suggestions, recurringItems] =
      await Promise.all([
        fetchCategories(),
        fetchHomeSummary(),
        fetchCategoryBudgets(),
        fetchAnalyticsSummary(),
        suggestionsPromise,
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

  useEffect(() => {
    if (!enabled) return;

    loadAll().catch((err) => {
      devError("useBudgetData loadAll failed", err);
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
    recurringRules,
    loadAll,
  };
}
