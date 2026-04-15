import { StyleSheet } from "react-native";

export const commonStyles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 18,
  },

  // 🔤 TYPOGRAPHY

  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    letterSpacing: -0.8,
  },

  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.4,
  },

  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },

  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  caption: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },

  moneyLarge: {
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    letterSpacing: -1.2,
  },

  money: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },

  // LAYOUT / SURFACE

  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },

  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },

  button: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    fontSize: 16,
    letterSpacing: 0.2,
  },

  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  twoColRow: {
  flexDirection: "row",
  gap: 12,
  },

});