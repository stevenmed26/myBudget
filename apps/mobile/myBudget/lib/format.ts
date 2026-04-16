export function formatCents(cents: number) {
    const sign = cents < 0 ? "-" : "";
    const abs = Math.abs(cents);
    return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}