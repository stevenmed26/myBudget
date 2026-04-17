import React, { useState } from "react";
import { Alert, SafeAreaView, ScrollView, Text, View, TextInput } from "react-native";
import { Card } from "../components/Card";
import { ActionButton } from "../components/ActionButton";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { SectionHeader } from "@/components/SectionHeader";
import { looksLikeEmail } from "../lib/validate";

export function SignUpScreen({
    colors,
    onSignUp,
    onSwitchToLogin,
} : {
    colors: ThemeColors;
    onSignUp: (email: string, password: string) => Promise<void>;
    onSwitchToLogin: () => void;
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        const trimmedEmail = email.trim();

        setError(null);

        if (!trimmedEmail || !password || !confirmPassword) {
            setError("Email and password are required.");
            return;
        }
        if (!looksLikeEmail(trimmedEmail)) {
            setError("Enter a valid email address.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setSubmitting(true);
            await onSignUp(trimmedEmail, password);
        } catch (err: any) {
            setError(err?.message ?? "Sign up failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <ScrollView contentContainerStyle={commonStyles.screenContent}>
                <Text style={[commonStyles.title, { color: colors.text }]}>myBudget</Text>

                <Card colors={colors}>
                    <SectionHeader
                        colors={colors}
                        title="Create Account"
                        subtitle="Start your budget setup"
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
                            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceRaised },
                        ]}
                    />

                    <TextInput
                        placeholder="Password"
                        placeholderTextColor={colors.textSoft}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                        textContentType="newPassword"
                        value={password}
                        onChangeText={(value) => {
                            setPassword(value);
                            if (error) setError(null);
                        }}
                        style={[
                            commonStyles.input,
                            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceRaised },
                        ]}
                    />

                    <TextInput
                        placeholder="Confirm Password"
                        placeholderTextColor={colors.textSoft}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                        textContentType="newPassword"
                        value={confirmPassword}
                        onChangeText={(value) => {
                            setConfirmPassword(value);
                            if (error) setError(null);
                        }}
                        style={[
                            commonStyles.input,
                            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceRaised },
                        ]}
                    />

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
                            <Text style={[commonStyles.caption, { color: colors.danger}]}>
                                {error}
                            </Text>
                        </View>
                    ) : null}

                    <ActionButton
                        label={submitting ? "Creating Account..." : "Create Account"}
                        colors={colors}
                        disabled={submitting}
                        onPress={handleSubmit}
                    />

                    <Text
                        onPress={submitting ? undefined :onSwitchToLogin}
                        style={[commonStyles.body, { color: colors.accent }]}
                    >
                        Already have an account? Sign in
                    </Text>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}