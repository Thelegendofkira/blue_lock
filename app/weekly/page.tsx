// app/weekly/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ForecastClient from "@/components/ForecastClient";

export default async function WeeklyPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const userId = session.user.id;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [goals, logs] = await Promise.all([
    prisma.goalNode.findMany({
      where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: { activatedAt: "asc" },
    }),
    prisma.dailyLog.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo },
        blockType: "TASK_EXECUTION",
      },
    }),
  ]);

  return <ForecastClient mode="weekly" goals={goals} logs={logs} />;
}
