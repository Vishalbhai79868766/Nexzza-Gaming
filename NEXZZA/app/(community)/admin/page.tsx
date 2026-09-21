import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin";
export const metadata = { title: "Moderation" };
export default async function Page() {
  const { role } = await requireUser();
  if (role.role === "player") redirect("/403");
  return <AdminDashboard />;
}
