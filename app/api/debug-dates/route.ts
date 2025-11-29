import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();

  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const startOfTomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );

  return NextResponse.json({
    serverTime: {
      iso: now.toISOString(),
      local: now.toString(),
      utcYear: now.getUTCFullYear(),
      utcMonth: now.getUTCMonth() + 1, // +1 porque getUTCMonth() retorna 0-11
      utcDate: now.getUTCDate(),
      utcHours: now.getUTCHours(),
      utcMinutes: now.getUTCMinutes(),
    },
    calculatedDates: {
      startOfToday: startOfToday.toISOString(),
      startOfTomorrow: startOfTomorrow.toISOString(),
    },
    sqlQuery: {
      todayFilter: `datetime_utc >= '${startOfToday.toISOString()}' AND datetime_utc < '${startOfTomorrow.toISOString()}'`,
    }
  });
}
