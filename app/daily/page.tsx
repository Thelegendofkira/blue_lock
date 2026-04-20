// app/daily/page.tsx
import { prisma } from "@/lib/prisma";
import DailyGrid from "@/components/DailyGrid";

export default async function DailyPage() {
  // TODO: Replace with real Auth ID (e.g., from NextAuth or Clerk) when implemented
  const DUMMY_USER_ID = "user_1"; 

  // 1. Get today's date at midnight for strict database querying
  const dateStr = new Date().toISOString().split("T")[0];
  const today = new Date(dateStr);

  // 2. Fetch today's logged blocks to populate the grid
  const todaysLogs = await prisma.dailyLog.findMany({
    where: {
      userId: DUMMY_USER_ID,
      date: today,
    },
  });

  // 3. Fetch ONLY active tasks that require execution
  const activeTasks = await prisma.goalNode.findMany({
    where: {
      userId: DUMMY_USER_ID,
      status: "ACTIVE",
      effortType: {
        not: "NOT_APPLICABLE", // Don't fetch top-level goals, only actionable tasks
      },
    },
    select: {
      id: true,
      title: true,
      effortType: true,
    }
  });

  return <DailyGrid userId={DUMMY_USER_ID} activeTasks={activeTasks} todaysLogs={todaysLogs} />;
}