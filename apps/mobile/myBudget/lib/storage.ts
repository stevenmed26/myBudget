import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
    analyticsRange: "myBudget.analytics.range",
    preferredHomeView: "myBudget.home.view",
};

export async function setStoredAnalyticsRange(value: string) {
    await AsyncStorage.setItem(KEYS.analyticsRange, value);
}

export async function getStoredAnalyticsRange() {
    return AsyncStorage.getItem(KEYS.analyticsRange);
}

export async function setStoredHomeView(value: string) {
    await AsyncStorage.setItem(KEYS.preferredHomeView, value);
}

export async function getStoredHomeView() {
    return AsyncStorage.getItem(KEYS.preferredHomeView);
}