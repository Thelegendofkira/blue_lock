// app/daily/page.tsx
import { prisma } from "@/lib/prisma";
import DailyGrid from "@/components/DailyGrid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function DailyPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");
  const REAL_USER_ID = session.user.id;

  // 1. TEMPORAL SHIFT: Calculate the "Logical" Day (Offset by 3 hours)
  // If it's 2:30 AM on Oct 5th, this makes the system treat it as Oct 4th.
  const now = new Date();
  const offsetTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const logicalTodayStr = offsetTime.toISOString().split("T")[0];
  const logicalToday = new Date(logicalTodayStr);

  // Calculate Logical Yesterday
  const logicalYesterday = new Date(logicalToday);
  logicalYesterday.setDate(logicalYesterday.getDate() - 1);

  // 2. Fetch logs for BOTH today and yesterday so the UI can toggle between them
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