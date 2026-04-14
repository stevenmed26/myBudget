import * as SecureStore from "expo-secure-store";

const KEYS = {
    authToken: "myBudget.authToken",
    refreshToken: "myBudget.refreshToken",
};

export async function setAuthToken(token: string) {
    await SecureStore.setItemAsync(KEYS.authToken, token);
}

export async function getAuthToken() {
    return SecureStore.getItemAsync(KEYS.authToken);
}

export async function deleteAuthToken() {
    await SecureStore.deleteItemAsync(KEYS.authToken);
}

export async function setRefreshToken(token: string) {
    await SecureStore.setItemAsync(KEYS.refreshToken, token);
}

export async function getRefreshToken() {
    return SecureStore.getItemAsync(KEYS.refreshToken);
}

export async function deleteRefreshToken() {
    await SecureStore.deleteItemAsync(KEYS.refreshToken);
}