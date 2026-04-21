import { prisma } from "@/lib/prisma";
import DailyGrid from "@/components/DailyGrid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function DailyPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const REAL_USER_ID = session.user.id;

  // TEMPORAL SHIFT: Day runs 03:00 → 02:59.
  // We use LOCAL wall-clock time so IST (or any non-UTC offset) is handled
  // correctly. toISOString() always returns UTC and would give the wrong date
  // for users in timezones that are ahead of UTC (e.g. IST = UTC+5:30).
  const now = new Date();
  // Shift back 3 hours in local time
  const shifted = new Date(now.getTime() - 3 * 3_600_000);
  // Build YYYY-MM-DD from LOCAL year/month/day (not UTC)
  const pad = (n: number) => String(n).padStart(2, "0");
  const logicalTodayStr = `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
  // Parse back as a Date at local-midnight (Prisma needs a Date object)
  const logicalToday = new Date(`${logicalTodayStr}T00:00:00`);

  const logicalYesterday = new Date(logicalToday);
  logicalYesterday.setDate(logicalYesterday.getDate() - 1);

  // Fetch logs for BOTH logical dates
  const recentLogs = await prisma.dailyLog.findMany({
    where: {
      userId: REAL_USER_ID,
      date: {
        in: [logicalToday, logicalYesterday]
      }
    },
    include: {
      task: { select: { id: true, title: true, effortType: true, quantifierUnit: true, targetQuantity: true, currentQuantity: true } },
    },
  });

  const activeTasks = await prisma.goalNode.findMany({
    where: { userId: REAL_USER_ID, isTask: true, status: "ACTIVE" },
    select: { id: true, title: true, effortType: true, quantifierUnit: true, targetQuantity: true, currentQuantity: true },
  });

  return (
    <DailyGrid
      userId={REAL_USER_ID}
      activeTasks={activeTasks}
      recentLogs={recentLogs}
      logicalToday={logicalToday}
      logicalYesterday={logicalYesterday}
    />
  );
}