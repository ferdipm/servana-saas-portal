"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useTheme } from "next-themes";

interface ReservationTrendsChartProps {
  data: {
    date: string;
    count: number;
    guests: number;
  }[];
}

export function ReservationTrendsChart({ data }: ReservationTrendsChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: format(parseISO(item.date), "dd MMM", { locale: es }),
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#e4e4e7"} />
          <XAxis
            dataKey="formattedDate"
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
            cursor={{ stroke: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)", strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: isDark ? "#a1a1aa" : "#71717a" }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: "#6366f1", r: 4 }}
            activeDot={{ r: 6 }}
            name="Reservas"
          />
          <Line
            type="monotone"
            dataKey="guests"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981", r: 4 }}
            activeDot={{ r: 6 }}
            name="Comensales"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
