export type Category = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string | null;
  is_default: boolean;
  counts_toward_budget: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryBudget = {
  id: string;
  category_id: string;
  category_name: string;
  category_color: string;
  amount_cents: number;
  cadence: "weekly" | "monthly" | "yearly";
  effective_from: string;
  effective_to?: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  category_id: string;
  amount_cents: number;
  transaction_type: "expense" | "income" | "adjustment" | "saved_rollover";
  transaction_date: string;
  merchant_name?: string | null;
  note?: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

export type BudgetProfile = {
  user_id: string;
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
  created_at: string;
  updated_at: string;
};

export type HomeCategoryProgress = {
  category_id: string;
  category_name: string;
  category_color: string;
  counts_toward_budget: boolean;
  budget_amount_cents: number;
  spent_amount_cents: number;
  remaining_amount_cents: number;
  percent_used: number;
};

export type HomeSummary = {
  period_start: string;
  period_end: string;
  tracking_cadence: "weekly" | "monthly";
  net_income_budget_cents: number;
  spent_amount_cents: number;
  remaining_amount_cents: number;
  category_progress_items: HomeCategoryProgress[];
};

export type ClosePeriodResponse = {
  period_start: string;
  period_end: string;
  status: string;
  net_income_budget_cents: number;
  spent_amount_cents: number;
  leftover_amount_cents: number;
  saved_transaction_id?: string;
  already_closed: boolean;
};

export type AnalyticsCategorySlice = {
  category_id: string;
  category_name: string;
  color: string;
  amount_cents: number;
};

export type AnalyticsTrendPoint = {
  label: string;
  income_cents: number;
  expense_cents: number;
};

export type AnalyticsSummary = {
  total_saved_cents: number;
  total_expenses_cents: number;
  total_income_cents: number;
  category_breakdown: AnalyticsCategorySlice[];
  monthly_trend: AnalyticsTrendPoint[];
};

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};