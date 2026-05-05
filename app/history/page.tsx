// app/history/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import HistoryClient from "@/components/HistoryClient";

export default async function HistoryPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) redirect("/login");

    const REAL_USER_ID = session.user.id;

    // Fetch the last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.dailyLog.findMany({
        where: {
            userId: REAL_USER_ID,
            date: { gte: thirtyDaysAgo }
        },
        include: { task: true }
    });

    const reports = await prisma.dailyReport.findMany({
        where: {
            userId: REAL_USER_ID,
            date: { gte: thirtyDaysAgo }
        },
        orderBy: { date: 'desc' }
    });

    return <HistoryClient logs={logs} reports={reports} />;
}