"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useTheme } from "next-themes";

interface ReservationSourcesChartProps {
  data: {
    source: string;
    count: number;
    percentage: number;
  }[];
}

const COLORS = {
  WhatsApp: "#10b981",
  Web: "#6366f1",
  Phone: "#f59e0b",
  "Teléfono": "#f59e0b", // Same color as Phone
  WalkIn: "#8b5cf6",
  Other: "#71717a",
};

export function ReservationSourcesChart({
  data,
}: ReservationSourcesChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const getColor = (source: string) => {
    return COLORS[source as keyof typeof COLORS] || COLORS.Other;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry: any) => `${entry.source}: ${entry.percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.source)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#18181b" : "#ffffff",
              border: `1px solid ${isDark ? "#27272a" : "#e4e4e7"}`,
              borderRadius: "8px",
              color: isDark ? "#f4f4f5" : "#18181b",
            }}
            itemStyle={{ color: isDark ? "#f4f4f5" : "#18181b" }}
            labelStyle={{ color: isDark ? "#f4f4f5" : "#18181b" }}
            formatter={(value: number, name: string, props: any) => [
              `${value} reservas (${props.payload.percentage.toFixed(1)}%)`,
              props.payload.source,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
