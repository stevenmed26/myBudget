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
import { VerifyEmailScreen } from "./screens/VerifyEmailScreen";

import { useAppColors } from "./styles/theme";
import { useAppData } from "./hooks/useAppData";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { devLog, devWarn } from "./lib/devlog";
import { formatCents } from "./lib/format";
import {
  clearSession,
  setAuthToken as storeAccessToken,
  setRefreshToken as storeRefreshToken,
} from "./lib/secureStore";
import {
  login,
  register,
  verifyEmail,
  resendVerification,
  setApiAuthToken,
  fetchOnboardingStatus,
  submitOnboarding,
  isUnauthorizedError,
  ApiError,
} from "./api";
import { VerificationDelivery } from "./types";

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
    budgetSuggestions,
    recurringRules,
    loadAll,
    addExpense,
    removeTransaction,
    addCategory,
    removeCategory,
    saveBudget,
    saveProfile,
    closePeriod,
    removeRecurringRule,
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
            smartBudgetingEnabled={profile?.smart_budgeting_enabled ?? true}
            budgetSuggestions={budgetSuggestions}
            onAddCategory={addCategory}
            onDeleteCategory={removeCategory}
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
            categories={categories}
            recurringRules={recurringRules}
            onSaveProfile={saveProfile}
            onRemoveRecurringRule={removeRecurringRule}
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

  const [authMode, setAuthMode] = useState<"login" | "signup" | "verify">("login");
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [verificationDelivery, setVerificationDelivery] =
    useState<VerificationDelivery>("unknown");

  useEffect(() => {
    if (!bootstrap.isReady || authInitialized) return;
    devLog("auth bootstrap initialized", { hasStoredToken: !!bootstrap.authToken });
    setAuthTokenState(bootstrap.authToken ?? null);
    setAuthInitialized(true);
  }, [bootstrap.isReady, bootstrap.authToken, authInitialized]);

  useEffect(() => {
    devLog("api auth token updated", { isAuthenticated: !!authToken });
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
        if (isUnauthorizedError(err)) {
          devWarn("onboarding status unauthorized; clearing session");
          await clearSession();
          setAuthTokenState(null);
          bootstrap.setAuthToken(null);
          setApiAuthToken(null);
          setOnboardingCompleted(null);
          setAuthMode("login");
          return;
        }

        devWarn("onboarding status failed", err);
        setOnboardingCompleted(null);
      }
    }

    loadOnboardingStatus();
  }, [authToken, bootstrap]);

  async function handleAuthSuccess(accessToken: string, refreshToken: string) {
    await Promise.all([
      storeAccessToken(accessToken),
      storeRefreshToken(refreshToken),
    ]);

    setAuthTokenState(accessToken);
    bootstrap.setAuthToken(accessToken);
    setApiAuthToken(accessToken);
    devLog("auth session stored");
  }

  async function handleLogin(email: string, password: string) {
    try {
      const resp = await login({ email, password });
      await handleAuthSuccess(resp.access_token, resp.refresh_token);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 403 &&
        err.message.toLowerCase().includes("not verified")
      ) {
        devWarn("login blocked; email verification required");
        setPendingVerificationEmail(email.trim().toLowerCase());
        setVerificationDelivery("unknown");
        setAuthMode("verify");
      }

      throw err;
    }
  }

  async function handleSignUp(email: string, password: string) {
    const resp = await register({ email, password });
    devLog("signup requires verification", { delivery: resp.delivery });
    setPendingVerificationEmail(resp.email);
    setVerificationDelivery(resp.delivery);
    setAuthMode("verify");
  }

  async function handleVerifyEmail(email: string, code: string) {
    const resp = await verifyEmail({ email, code });
    await handleAuthSuccess(resp.access_token, resp.refresh_token);
    devLog("email verified");
  }

  async function handleResendVerification(email: string) {
    const resp = await resendVerification({ email });
    devLog("verification code resent", { delivery: resp.delivery });
    setPendingVerificationEmail(resp.email);
    setVerificationDelivery(resp.delivery);
    return resp.delivery;
  }

  async function handleLogout() {
    await clearSession();
    devLog("auth session cleared");
    setAuthTokenState(null);
    bootstrap.setAuthToken(null);
    setApiAuthToken(null);
    setOnboardingCompleted(null);
    setPendingVerificationEmail("");
    setVerificationDelivery("unknown");
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
    smart_budgeting_enabled: boolean;
    category_budgets: {
      category_name: string;
      amount_cents: number;
      cadence: "weekly" | "monthly" | "yearly";
    }[];
  }) {
    await submitOnboarding(input);
    devLog("onboarding completed", {
      tracking_cadence: input.tracking_cadence,
      smart_budgeting_enabled: input.smart_budgeting_enabled,
      category_count: input.category_budgets.length,
    });
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
        ) : authMode === "signup" ? (
          <SignUpScreen
            colors={colors}
            onSignUp={handleSignUp}
            onSwitchToLogin={() => setAuthMode("login")}
          />
        ) : (
          <VerifyEmailScreen
            colors={colors}
            initialEmail={pendingVerificationEmail}
            delivery={verificationDelivery}
            onVerify={handleVerifyEmail}
            onResend={handleResendVerification}
            onBackToLogin={() => setAuthMode("login")}
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
