import {
  AnalyticsSummary,
  BudgetProfile,
  Category,
  CategoryBudget,
  ClosePeriodResponse,
  HomeSummary,
  Transaction,
  AuthUser,
  AuthResponse,
  OnboardingStatus,
  RegisterResponse,
  ResendVerificationResponse,
} from "./types";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8080/api/v1";

let authToken: string | null = null;

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function isUnauthorizedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

function buildHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(extra ?? {}),
  };
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const rawText = await res.text();
  const body = rawText ? safeJsonParse(rawText) : undefined;

  if (!res.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : rawText || `request failed: ${res.status}`;

    throw new ApiError(message, res.status, body);
  }

  if (!rawText) {
    return undefined as T;
  }

  return (body as T) ?? (JSON.parse(rawText) as T);
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    headers: buildHeaders(),
  });
  const data = await handle<{ categories: Category[] }>(res);
  return data.categories;
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE_URL}/transactions`, {
    headers: buildHeaders(),
  });
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
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handle<Transaction>(res);
}

export async function deleteTransaction(transactionID: string) {
  const res = await fetch(`${API_BASE_URL}/transactions/${transactionID}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  return handle<{ deleted: boolean }>(res);
}

export async function fetchProfile(): Promise<BudgetProfile> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    headers: buildHeaders(),
  });
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
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handle<BudgetProfile>(res);
}

export async function fetchHomeSummary(): Promise<HomeSummary> {
  const res = await fetch(`${API_BASE_URL}/home/summary`, {
    headers: buildHeaders(),
  });
  return handle<HomeSummary>(res);
}

export async function fetchCategoryBudgets(): Promise<CategoryBudget[]> {
  const res = await fetch(`${API_BASE_URL}/category-budgets`, {
    headers: buildHeaders(),
  });
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
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handle<CategoryBudget>(res);
}

export async function closeCurrentPeriod(): Promise<ClosePeriodResponse> {
  const res = await fetch(`${API_BASE_URL}/periods/close-current`, {
    method: "POST",
    headers: buildHeaders(),
  });
  return handle<ClosePeriodResponse>(res);
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
    headers: buildHeaders(),
  });
  return handle<AnalyticsSummary>(res);
}

export async function register(input: { email: string; password: string }) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handle<RegisterResponse>(res);
}

export async function login(input: { email: string; password: string }) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handle<AuthResponse>(res);
}

export async function verifyEmail(input: { email: string; code: string }) {
  const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handle<AuthResponse>(res);
}

export async function resendVerification(input: { email: string }) {
  const res = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handle<ResendVerificationResponse>(res);
}

export async function refreshAccessToken(input: { refresh_token: string }) {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handle<AuthResponse>(res);
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: buildHeaders(),
  });
  return handle<AuthUser>(res);
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const res = await fetch(`${API_BASE_URL}/onboarding/status`, {
    headers: buildHeaders(),
  });
  return handle<OnboardingStatus>(res);
}

export async function submitOnboarding(input: {
  tracking_cadence: "weekly" | "monthly";
  week_starts_on: number;
  monthly_anchor_day: number;
  income_amount_cents: number;
  income_cadence: "weekly" | "biweekly" | "monthly" | "yearly";
  location_code: string;
  estimated_tax_rate_bps: number;
  category_budgets: {
    category_name: string;
    amount_cents: number;
    cadence: "weekly" | "monthly" | "yearly";
  }[];
}) {
  const res = await fetch(`${API_BASE_URL}/onboarding/submit`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });
  return handle<OnboardingStatus>(res);
}