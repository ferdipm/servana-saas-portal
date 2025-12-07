"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "next-themes";

interface OccupancyByTimeChartProps {
  data: {
    hour: number;
    count: number;
    guests: number;
  }[];
}

export function OccupancyByTimeChart({ data }: OccupancyByTimeChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const formattedData = data.map((item) => ({
    ...item,
    time: `${item.hour.toString().padStart(2, "0")}:00`,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#e4e4e7"} />
          <XAxis
            dataKey="time"
            stroke={isDark ? "#71717a" : "#a1a1aa"}
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke={isDark ? "#71717a" : "#a1a1aa"} style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#18181b" : "#ffffff",
              border: `1px solid ${isDark ? "#27272a" : "#e4e4e7"}`,
              borderRadius: "8px",
              color: isDark ? "#f4f4f5" : "#18181b",
            }}
            labelStyle={{ color: isDark ? "#a1a1aa" : "#71717a" }}
            cursor={{ fill: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: isDark ? "#a1a1aa" : "#71717a" }}
            iconType="rect"
          />
          <Bar
            dataKey="count"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            name="Reservas"
            activeBar={{ fill: "#059669" }}
          />
          <Bar
            dataKey="guests"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            name="Comensales"
            activeBar={{ fill: "#4f46e5" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
