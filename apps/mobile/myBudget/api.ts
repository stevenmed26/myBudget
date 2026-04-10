import {
  AnalyticsSummary,
  BudgetProfile,
  Category,
  CategoryBudget,
  ClosePeriodResponse,
  HomeSummary,
  Transaction,
} from "./types";

const API_BASE_URL = "http://192.168.1.10:8080/api/v1";
// iPhone const API_BASE_URL = "http://127.0.0.1:8080/api/v1";
// Android const API_BASE_URL = "http://10.0.2.2:8080/api/v1";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/categories`);
  const data = await handle<{ categories: Category[] }>(res);
  return data.categories;
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE_URL}/transactions`);
  const data = await handle<{ transactions: Transaction[] }>(res);
  return data.transactions;
}

export async function createTransaction(input: {
  category_id: string;
  amount_cents: number;
  transaction_type: "expense" | "income";
  transaction_date: string;
  merchant_name?: string;
  note?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<Transaction>(res);
}

export async function deleteTransaction(transactionID: string) {
  const res = await fetch(`${API_BASE_URL}/transactions/${transactionID}`, {
    method: "DELETE",
  });
  return handle<{ deleted: boolean }>(res);
}

export async function fetchProfile(): Promise<BudgetProfile> {
  const res = await fetch(`${API_BASE_URL}/profile`);
  return handle<BudgetProfile>(res);
}

export async function updateProfile(input: {
  tracking_cadence: "weekly" | "monthly";
  week_starts_on: number;
  monthly_anchor_day: number;
  currency_code: string;
  locale: string;
  timezone: string;
  income_amount_cents: number;
  income_cadence: "weekly" | "biweekly" | "monthly" | "yearly";
  location_code: string;
  estimated_tax_rate_bps: number;
}) {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<BudgetProfile>(res);
}

export async function fetchHomeSummary(): Promise<HomeSummary> {
  const res = await fetch(`${API_BASE_URL}/home/summary`);
  return handle<HomeSummary>(res);
}

export async function fetchCategoryBudgets(): Promise<CategoryBudget[]> {
  const res = await fetch(`${API_BASE_URL}/category-budgets`);
  const data = await handle<{ category_budgets: CategoryBudget[] }>(res);
  return data.category_budgets;
}

export async function upsertCategoryBudget(input: {
  category_id: string;
  amount_cents: number;
  cadence: "weekly" | "monthly" | "yearly";
  effective_from: string;
}) {
  const res = await fetch(`${API_BASE_URL}/category-budgets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<CategoryBudget>(res);
}

export async function closeCurrentPeriod(): Promise<ClosePeriodResponse> {
  const res = await fetch(`${API_BASE_URL}/periods/close-current`, {
    method: "POST",
  });
  return handle<ClosePeriodResponse>(res);
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE_URL}/analytics/summary`);
  return handle<AnalyticsSummary>(res);
}