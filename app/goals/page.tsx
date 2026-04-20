import { prisma } from "@/lib/prisma";
import DailyGrid from "@/components/DailyGrid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import GoalDashboard from "@/components/GoalDashboard";

export default async function GoalsPage() {
  // TODO: Replace with real Auth ID later
 const session = await getServerSession(authOptions);
  
  // 2. If they aren't logged in, kick them out
  if (!session || !session.user) {
    redirect("/login");
  }

  // 3. Swap the Dummy ID for the REAL secure ID
  const REAL_USER_ID = session.user.id;

  // Fetch all nodes for this user to build the hierarchy
  // We fetch them sorted by creation date so the newest tasks appear logically
  const allNodes = await prisma.goalNode.findMany({
    where: {
      userId: REAL_USER_ID,
      status: "ACTIVE", 
    },
    orderBy: {
      activatedAt: 'asc'
    }
  });

  return <GoalDashboard userId={REAL_USER_ID} allNodes={allNodes} />;
}