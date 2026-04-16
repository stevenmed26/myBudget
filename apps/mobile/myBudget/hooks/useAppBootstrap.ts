import { useEffect, useState } from 'react';
import { getStoredAnalyticsRange, getStoredHomeView } from "../lib/storage";
import { getAuthToken } from "../lib/secureStore";

export function useAppBootstrap() {
    const [isReady, setIsReady] = useState(false);
    const [analyticsRange, setAnalyticsRange] = useState("12m");
    const [homeView, setHomeView] = useState("progress");
    const [authToken, setAuthToken] = useState<string | null>(null);

    useEffect(() => {
        async function bootstrap() {
            const [storedRange, storedView, token] = await Promise.all([
                getStoredAnalyticsRange(),
                getStoredHomeView(),
                getAuthToken(),
            ]);

            if (storedRange) setAnalyticsRange(storedRange);
            if (storedView) setHomeView(storedView);
            if (token) setAuthToken(token);

            setIsReady(true);
        }

        bootstrap().catch(() => setIsReady(true));
    }, []);

    return {
        isReady,
        analyticsRange,
        setAnalyticsRange,
        homeView,
        setHomeView,
        authToken,
        setAuthToken,
    };
}