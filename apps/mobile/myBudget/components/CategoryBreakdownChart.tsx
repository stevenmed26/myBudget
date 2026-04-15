import React from "react";
import { Text, View } from "react-native";
import { VictoryPie } from "victory-native";
import { AnalyticsCategorySlice } from "../types";
import { ThemeColors } from "../styles/theme";
import { formatCents } from "../lib/format";

export function CategoryBreakdownChart({
    colors,
    items,
}: {
    colors: ThemeColors;
    items: AnalyticsCategorySlice[];
}) {
    const filtered = items.filter((x) => x.amount_cents > 0).slice(0, 6);

    if (filtered.length === 0) {
        return <Text style={{ color: colors.textMuted }}>No category spending yet.</Text>;
    }

    return (
        <View style={{ gap: 12 }}>
            <VictoryPie
                data={filtered.map((item) => ({
                    x: item.category_name,
                    y: item.amount_cents,
                }))}
                colorScale={filtered.map((item) => item.color)}
                innerRadius={55}
                padAngle={2}
                labels={() => ""}
                width={320}
                height={220}
            />

            <View style={{ gap: 8 }}>
                {filtered.map((item) => (
                    <View
                        key={item.category_id}
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    backgroundColor: item.color,
                                }}
                            />
                            <Text style={{ color: colors.text }}>{item.category_name }</Text>
                        </View>
                        <Text style={{ color: colors.text, fontWeight: "700" }}>
                            {formatCents(item.amount_cents)}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    )
}