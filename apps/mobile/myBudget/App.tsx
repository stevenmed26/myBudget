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
import { OnboardingScreen } from "./screens/OnboardingScreen";

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
  fetchOnboardingStatus,
  isUnauthorizedError,
  login,
  register,
  setApiAuthToken,
  submitOnboarding,
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
        {() => <AnalyticsScreen colors={colors} analytics={analytics} />}
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
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!bootstrap.isReady || authInitialized) return;
    setAuthTokenState(bootstrap.authToken ?? null);
    setAuthInitialized(true);
  }, [bootstrap.isReady, bootstrap.authToken, authInitialized]);

  useEffect(() => {
    setApiAuthToken(authToken);
  }, [authToken]);

  useEffect(() => {
    async function loadOnboardingStatus() {
      if (!authToken) {
        setOnboardingCompleted(null);
        return;
      }

      try {
        const status = await fetchOnboardingStatus();
        setOnboardingCompleted(status.completed);
      } catch (err) {
        console.error("Failed loading onboarding status", err);

        if (isUnauthorizedError(err)) {
          await clearSession();
          setAuthTokenState(null);
          bootstrap.setAuthToken(null);
          setApiAuthToken(null);
          setOnboardingCompleted(null);
          setAuthMode("login");
          return;
        }

        setOnboardingCompleted((current) => current ?? false);
      }
    }

    loadOnboardingStatus();
  }, [authToken, bootstrap]);

  async function handleAuthSuccess(accessToken: string, refreshToken: string) {
    await Promise.all([storeAccessToken(accessToken), storeRefreshToken(refreshToken)]);

    setAuthTokenState(accessToken);
    bootstrap.setAuthToken(accessToken);
    setApiAuthToken(accessToken);
  }

  async function handleLogin(email: string, password: string) {
    try {
      const resp = await login({ email, password });
      await handleAuthSuccess(resp.access_token, resp.refresh_token);
    } catch (err) {
      console.error("handleLogin failed", err);
      throw err;
    }
  }

  async function handleSignUp(email: string, password: string) {
    try {
      const resp = await register({ email, password });
      await handleAuthSuccess(resp.access_token, resp.refresh_token);
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
    setOnboardingCompleted(null);
    setAuthMode("login");
  }

  async function handleOnboardingSubmit(input: {
    tracking_cadence: "weekly" | "monthly";
    week_starts_on: number;
    monthly_anchor_day: number;
    income_amount_cents: number;
    income_cadence: "weekly" | "biweekly" | "monthly" | "yearly";
    location_code: string;
    estimated_tax_rate_bps: number;
    category_budgets: {
      category_name: string;
      amount_cents: number;
      cadence: "weekly" | "monthly" | "yearly";
    }[];
  }) {
    await submitOnboarding(input);
    setOnboardingCompleted(true);
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

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        authMode === "login" ? (
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
        )
      ) : onboardingCompleted === null ? (
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
      ) : !onboardingCompleted ? (
        <OnboardingScreen colors={colors} onSubmit={handleOnboardingSubmit} />
      ) : (
        <AuthenticatedApp colors={colors} onLogout={handleLogout} />
      )}
    </NavigationContainer>
  );
}
