import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin-dashboard";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  // Fetch all users
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch recent messages with user emails
  // Since we want to join messages -> chats -> profiles, we can do a nested select in Supabase
  const { data: recentMessages } = await supabase
    .from("messages")
    .select(`
      id,
      content,
      created_at,
      chats (
        user_id,
        profiles (
          email
        )
      )
    `)
    .eq('role', 'user')
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-muted/20">
      <AdminDashboard initialUsers={users || []} recentMessages={recentMessages || []} />
    </div>
  );
}
