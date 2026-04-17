export function formatCents(cents: number) {
    const sign = cents < 0 ? "-" : "";
    const abs = Math.abs(cents);
    return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function todayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
