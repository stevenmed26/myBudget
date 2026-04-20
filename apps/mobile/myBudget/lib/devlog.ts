const appEnv =
    process.env.APP_ENV ??
    process.env.EXPO_PUBLIC_APP_ENV ??
    "";

const enabled =
    String(appEnv).toLowerCase() === "development" || __DEV__;

export function devLog(...args: unknown[]) {
    if (enabled) {
        console.log("[DEV]", ...args);
    }
}

export function devWarn(...args: unknown[]) {
    if (enabled) {
        console.log("[DEV]", ...args);
    }
}

export function devError(...args: unknown[]) {
    if (enabled) {
        console.log("[DEV]", ...args);
    }
}

export function isDevLoggingEnabled() {
    return enabled;
}