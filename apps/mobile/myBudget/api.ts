import { Category, Summary, Transaction, BudgetProfile, HomeCategoryProgress, HomeSummary } from "./types";

const API_BASE_URL = "http://192.168.1.10:8080/api";
// Replace with LAN IP for physical device testing
// Use http://10.0.2.2:8080 for Android emulator
// Use http://127.0.0.1:8080 for iOS simulator

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

export async function fetchTransactions(startDate?: string, endDate?: string): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    const url = params.toString()
    ? `${API_BASE_URL}/transactions?${params.toString()}`
    : `${API_BASE_URL}/transactions`;

    const res = await fetch(url);
    const data = await handle<{ transactions: Transaction[] }>(res);
    return data.transactions;
}

export async function fetchSummary(startDate?: string, endDate?: string): Promise<Summary> {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    const url = params.toString()
    ? `${API_BASE_URL}/dashboard/summary?${params.toString()}`
    : `$API_BASE_URL/dashboard/summary`;

    const res = await fetch(url);
    return handle<Summary>(res);
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
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(input),
    });
    return handle<BudgetProfile>(res);
}

export async function fetchHomeSummary(): Promise<HomeSummary> {
    const res = await fetch(`${API_BASE_URL}/dashboard/home_summary`);
    return handle<HomeSummary>(res);
}

export async function createTransaction(input: {
    category_id: string;
    amount_cents: number;
    transaction_type: 'expense' | 'income';
    transaction_date: string;
    merchant_name?: string;
    note?: string;
}) {
    const res = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
    });

    return handle<Transaction>(res);
}

export async function upsertCategoryBudget(input: {
    category_id: string;
    amount_cents: number;
    cadence: "weekly" | "monthly" | "yearly";
    effective_from: string;
}) {
    const res = await fetch(`${API_BASE_URL}/budgets`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
    });
    return handle(res);
}