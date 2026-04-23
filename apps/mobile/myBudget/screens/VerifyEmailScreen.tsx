import React, { useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { Card } from "../components/Card";
import { ActionButton } from "../components/ActionButton";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { SectionHeader } from "../components/SectionHeader";
import { looksLikeEmail } from "../lib/validate";

export function VerifyEmailScreen({
  colors,
  initialEmail,
  delivery,
  onVerify,
  onResend,
  onBackToLogin,
}: {
  colors: ThemeColors;
  initialEmail: string;
  delivery: "email" | "development_log" | "unknown" | "already_verified";
  onVerify: (email: string, code: string) => Promise<void>;
  onResend: (email: string) => Promise<"email" | "development_log" | "unknown" | "already_verified">;
  onBackToLogin: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    delivery === "development_log"
      ? "Development mode: check the API logs for the verification code."
      : "Enter the verification code we sent to your email."
  );
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    const trimmedEmail = email.trim();
    const trimmedCode = code.replace(/\D/g, "");

    setError(null);
    setInfo(null);

    if (!looksLikeEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (trimmedCode.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    try {
      setSubmitting(true);
      await onVerify(trimmedEmail, trimmedCode);
    } catch (err: any) {
      setError(err?.message ?? "Verification failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    const trimmedEmail = email.trim();

    setError(null);
    setInfo(null);

    if (!looksLikeEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setResending(true);
      const nextDelivery = await onResend(trimmedEmail);

      if (nextDelivery === "development_log") {
        setInfo("Development mode: a new code was written to the API logs.");
      } else if (nextDelivery === "already_verified") {
        setInfo("That email is already verified. You can sign in.");
      } else {
        setInfo("A new verification code has been sent.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Could not resend verification code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={commonStyles.screenContent}>
        <Text style={[commonStyles.title, { color: colors.text }]}>myBudget</Text>

        <Card colors={colors}>
          <SectionHeader
            colors={colors}
            title="Verify Your Email"
            subtitle="Enter the code to finish creating your account"
          />

          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.textSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError(null);
            }}
            style={[
              commonStyles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.surfaceRaised,
              },
            ]}
          />

          <TextInput
            placeholder="Verification Code"
            placeholderTextColor={colors.textSoft}
            autoCapitalize="none"
            keyboardType="number-pad"
            value={code}
            onChangeText={(value) => {
              setCode(value.replace(/\D/g, "").slice(0, 6));
              if (error) setError(null);
            }}
            style={[
              commonStyles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.surfaceRaised,
              },
            ]}
          />

          {info ? (
            <View
              style={{
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
                {info}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View
              style={{
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text style={[commonStyles.caption, { color: colors.danger }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <ActionButton
            label={submitting ? "Verifying..." : "Verify Email"}
            colors={colors}
            disabled={submitting || resending}
            onPress={handleVerify}
          />

          <ActionButton
            label={resending ? "Resending..." : "Resend Code"}
            colors={colors}
            disabled={submitting || resending}
            onPress={handleResend}
          />

          <Text
            onPress={submitting || resending ? undefined : onBackToLogin}
            style={[commonStyles.body, { color: colors.accent }]}
          >
            Back to Sign In
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
