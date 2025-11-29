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

interface ReservationTrendsChartProps {
  data: {
    date: string;
    count: number;
    guests: number;
  }[];
}

export function ReservationTrendsChart({ data }: ReservationTrendsChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: format(parseISO(item.date), "dd MMM", { locale: es }),
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="formattedDate"
            stroke="#71717a"
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke="#71717a" style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#f4f4f5",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            cursor={{ stroke: "rgba(255, 255, 255, 0.1)", strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
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
