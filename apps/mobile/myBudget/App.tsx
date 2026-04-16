import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { HomeScreen } from "./screens/HomeScreen";
import { TransactionsScreen } from "./screens/TransactionsScreen";
import { CategoriesScreen } from "./screens/CategoriesScreen";
import { AnalyticsScreen } from "./screens/AnalyticsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { SignUpScreen } from "./screens/SignUpScreen";

import { useAppColors } from "./styles/theme";
import { useAppData } from "./hooks/useAppData";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { formatCents } from "./lib/format";
import {
  clearSession,
  setAuthToken as storeAccessToken,
  setRefreshToken as storeRefreshToken,
} from "./lib/secureStore";
import {
  login,
  register,
  setApiAuthToken,
} from "./api";

const Tab = createBottomTabNavigator();

function AuthenticatedApp({
  colors,
  onLogout,
}: {
  colors: ReturnType<typeof useAppColors>;
  onLogout: () => Promise<void>;
}) {
  const {
    categories,
    transactions,
    budgets,
    homeSummary,
    profile,
    analytics,
    loadAll,
    addExpense,
    removeTransaction,
    saveBudget,
    saveProfile,
    closePeriod,
  } = useAppData(true);

  async function handleClosePeriod() {
    const result = await closePeriod();

    if (result.already_closed) {
      Alert.alert(
        "Already closed",
        `This period was already closed.\nLeftover: ${formatCents(result.leftover_amount_cents)}`
      );
      return;
    }

    Alert.alert(
      "Period closed",
      `Leftover moved to Saved: ${formatCents(Math.max(0, result.leftover_amount_cents))}`
    );
  }

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        height: 64,
        paddingTop: 6,
      },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textMuted,
    }),
    [colors]
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: "home-outline",
            Transactions: "receipt-outline",
            Categories: "grid-outline",
            Analytics: "bar-chart-outline",
            Profile: "person-outline",
          };

          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home">
        {() => (
          <HomeScreen
            colors={colors}
            homeSummary={homeSummary}
            onRefresh={loadAll}
            onClosePeriod={handleClosePeriod}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Transactions">
        {() => (
          <TransactionsScreen
            colors={colors}
            categories={categories}
            transactions={transactions}
            onAddExpense={addExpense}
            onDeleteTransaction={removeTransaction}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Categories">
        {() => (
          <CategoriesScreen
            colors={colors}
            budgets={budgets}
            onSaveBudget={saveBudget}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Analytics">
        {() => (
          <AnalyticsScreen
            colors={colors}
            analytics={analytics}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile">
        {() => (
          <ProfileScreen
            colors={colors}
            profile={profile}
            onSaveProfile={saveProfile}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const colors = useAppColors();
  const bootstrap = useAppBootstrap();

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    if (!bootstrap.isReady || authInitialized) return;
    setAuthTokenState(bootstrap.authToken ?? null);
    setAuthInitialized(true);
  }, [bootstrap.isReady, bootstrap.authToken, authInitialized]);

  useEffect(() => {
    setApiAuthToken(authToken);
  }, [authToken]);

  async function handleAuthSuccess(accessToken: string, refreshToken: string) {
    console.log("handleAuthSuccess called");
    console.log("accessToken?", !!accessToken);
    console.log("refreshToken?", !!refreshToken);

    await Promise.all([
      storeAccessToken(accessToken),
      storeRefreshToken(refreshToken),
    ]);

    console.log("tokens stored");

    setAuthTokenState(accessToken);
    bootstrap.setAuthToken(accessToken);
    setApiAuthToken(accessToken);

    console.log("state updated");
  }

  async function handleLogin(email: string, password: string) {
    console.log("handleLogin start", email);

    try {
      const resp = await login({ email, password });
      console.log("login response", resp);

      await handleAuthSuccess(resp.access_token, resp.refresh_token);
      console.log("handleLogin complete");
    } catch (err) {
      console.error("handleLogin failed", err);
      throw err;
    }
  }

  async function handleSignUp(email: string, password: string) {
    console.log("handleSignUp start", email);

    try {
      const resp = await register({ email, password });
      console.log("signup response", resp);

      await handleAuthSuccess(resp.access_token, resp.refresh_token);
      console.log("handleSignUp complete");
    } catch (err) {
      console.error("handleSignUp failed", err);
      throw err;
    }
  }

  async function handleLogout() {
    await clearSession();
    setAuthTokenState(null);
    bootstrap.setAuthToken(null);
    setApiAuthToken(null);
    setAuthMode("login");
  }

  if (!bootstrap.isReady || !authInitialized) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const isAuthenticated = !!authToken;

  console.log("bootstrap.isReady", bootstrap.isReady);
  console.log("bootstrap.authToken", bootstrap.authToken);
  console.log("authToken state", authToken);
  console.log("isAuthenticated", !!authToken);

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AuthenticatedApp colors={colors} onLogout={handleLogout} />
      ) : authMode === "login" ? (
        <LoginScreen
          colors={colors}
          onLogin={handleLogin}
          onSwitchToSignUp={() => setAuthMode("signup")}
        />
      ) : (
        <SignUpScreen
          colors={colors}
          onSignUp={handleSignUp}
          onSwitchToLogin={() => setAuthMode("login")}
        />
      )}
    </NavigationContainer>
  );
}