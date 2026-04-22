import {
  AnalyticsSummary,
  BudgetSuggestionsResponse,
  BudgetProfile,
  Category,
  CategoryBudget,
  ClosePeriodResponse,
  HomeSummary,
  Transaction,
  AuthUser,
  AuthResponse,
  OnboardingStatus,
  RecurringRule,
  RegisterResponse,
  ResendVerificationResponse,
} from "./types";
import { devWarn } from "./lib/devlog";
import {
  clearSession,
  getRefreshToken,
  setAuthToken as storeAccessToken,
  setRefreshToken as storeRefreshToken,
} from "./lib/secureStore";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8080/api/v1";

let authToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredHandler: (() => void | Promise<void>) | null = null;

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

export function setApiSessionExpiredHandler(handler: (() => void | Promise<void>) | null) {
  sessionExpiredHandler = handler;
}

function buildHeaders(extra?: HeadersInit, token: string | null = authToken) {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
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

    devWarn("api request failed", {
      status: res.status,
      url: res.url,
      message,
    });

    throw new ApiError(message, res.status, body);
  }

  if (!rawText) {
    return undefined as T;
  }

  return (body as T) ?? (JSON.parse(rawText) as T);
}

async function refreshSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        authToken = null;
        await clearSession();
        await sessionExpiredHandler?.();
        return null;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: buildHeaders(undefined, null),
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = await handle<AuthResponse>(res);
        authToken = data.access_token;
        await Promise.all([
          storeAccessToken(data.access_token),
          storeRefreshToken(data.refresh_token),
        ]);
        return data.access_token;
      } catch (err) {
        devWarn("token refresh failed; clearing session", err);
        authToken = null;
        await clearSession();
        await sessionExpiredHandler?.();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean } = {}
): Promise<T> {
  const authenticated = options.authenticated ?? true;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(init.headers),
  });

  if (authenticated && res.status === 401) {
    const refreshedToken = await refreshSession();
    if (refreshedToken) {
      const retry = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: buildHeaders(init.headers, refreshedToken),
      });
      return handle<T>(retry);
    }
  }

  return handle<T>(res);
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await request<{ categories: Category[] }>("/categories");
  return data.categories;
}

export async function createCategory(input: {
  name: string;
  color: string;
  icon?: string | null;
  counts_toward_budget: boolean;
}) {
  return request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteCategory(categoryID: string) {
  return request<{ deleted: boolean }>(`/categories/${categoryID}`, {
    method: "DELETE",
  });
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const data = await request<{ transactions: Transaction[] }>("/transactions");
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
  return request<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteTransaction(transactionID: string) {
  return request<{ deleted: boolean }>(`/transactions/${transactionID}`, {
    method: "DELETE",
  });
}

export async function fetchRecurringRules(): Promise<RecurringRule[]> {
  const data = await request<{ recurring_rules: RecurringRule[] }>("/recurring-rules");
  return data.recurring_rules;
}

export async function createRecurringRule(input: {
  category_id: string;
  name: string;
  amount_cents: number;
  rule_type: "expense" | "income";
  frequency: "weekly" | "biweekly" | "monthly" | "yearly";
  start_date: string;
  end_date?: string | null;
}) {
  return request<RecurringRule>("/recurring-rules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateRecurringRule(
  ruleID: string,
  input: {
    category_id: string;
    name: string;
    amount_cents: number;
    rule_type: "expense" | "income";
    frequency: "weekly" | "biweekly" | "monthly" | "yearly";
    start_date: string;
    end_date?: string | null;
    active: boolean;
  }
) {
  return request<RecurringRule>(`/recurring-rules/${ruleID}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteRecurringRule(ruleID: string) {
  return request<{ deleted: boolean }>(`/recurring-rules/${ruleID}`, {
    method: "DELETE",
  });
}

export async function fetchProfile(): Promise<BudgetProfile> {
  return request<BudgetProfile>("/profile");
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
  smart_budgeting_enabled: boolean;
}) {
  return request<BudgetProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function fetchHomeSummary(): Promise<HomeSummary> {
  return request<HomeSummary>("/home/summary");
}

export async function fetchCategoryBudgets(): Promise<CategoryBudget[]> {
  const data = await request<{ category_budgets: CategoryBudget[] }>("/category-budgets");
  return data.category_budgets;
}

export async function fetchBudgetSuggestions(): Promise<BudgetSuggestionsResponse> {
  return request<BudgetSuggestionsResponse>("/recommendations/budget-suggestions");
}

export async function upsertCategoryBudget(input: {
  category_id: string;
  amount_cents: number;
  cadence: "weekly" | "monthly" | "yearly";
  effective_from: string;
}) {
  return request<CategoryBudget>("/category-budgets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function closeCurrentPeriod(): Promise<ClosePeriodResponse> {
  return request<ClosePeriodResponse>("/periods/close-current", {
    method: "POST",
  });
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>("/analytics/summary");
}

export async function register(input: { email: string; password: string }) {
  return request<RegisterResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { authenticated: false }
  );
}

export async function login(input: { email: string; password: string }) {
  return request<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { authenticated: false }
  );
}

export async function verifyEmail(input: { email: string; code: string }) {
  return request<AuthResponse>(
    "/auth/verify-email",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { authenticated: false }
  );
}

export async function resendVerification(input: { email: string }) {
  return request<ResendVerificationResponse>(
    "/auth/resend-verification",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { authenticated: false }
  );
}

export async function refreshAccessToken(input: { refresh_token: string }) {
  return request<AuthResponse>(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { authenticated: false }
  );
}

export async function fetchMe(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me");
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  return request<OnboardingStatus>("/onboarding/status");
}

export async function submitOnboarding(input: {
  tracking_cadence: "weekly" | "monthly";
  week_starts_on: number;
  monthly_anchor_day: number;
  income_amount_cents: number;
  income_cadence: "weekly" | "biweekly" | "monthly" | "yearly";
  location_code: string;
  estimated_tax_rate_bps: number;
  smart_budgeting_enabled: boolean;
  category_budgets: {
    category_name: string;
    amount_cents: number;
    cadence: "weekly" | "monthly" | "yearly";
  }[];
}) {
  return request<OnboardingStatus>("/onboarding/submit", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
