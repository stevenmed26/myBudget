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

export type Transaction = {
    id: string;
    user_id: string;
    category_id: string;
    amount_cents: number;
    transaction_type: 'expense' | 'income' | 'adjustment' | 'saved_rollover';
    transaction_date: string;
    merchant_name?: string | null;
    note?: string | null;
    source: string;
    created_at: string;
    updated_at: string;
};

export type Summary = {
    period_start: string;
    period_end: string;
    income_cents: number;
    expense_cents: number;
    saved_cents: number;
    net_cents: number;
    remaining_budget_cents: number;
};