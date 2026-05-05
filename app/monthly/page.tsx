// app/monthly/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ForecastClient from "@/components/ForecastClient";

export default async function MonthlyPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const userId = session.user.id;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [goals, logs] = await Promise.all([
    prisma.goalNode.findMany({
      where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: { activatedAt: "asc" },
    }),
    prisma.dailyLog.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
        blockType: "TASK_EXECUTION",
      },
    }),
  ]);

  return <ForecastClient mode="monthly" goals={goals} logs={logs} />;
}
