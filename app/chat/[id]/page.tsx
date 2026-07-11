import { createClient } from "@/lib/supabase/server";
import { ChatUI } from "@/components/chat-ui";
import { UIMessage } from "ai";
import { redirect } from "next/navigation";

export default async function ChatHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch messages for this chat
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", id)
    .order("created_at", { ascending: true });

  const initialMessages: UIMessage[] = (messages || []).map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system' | 'data',
    parts: [{ type: 'text', text: msg.content }],
    content: msg.content
  }));

  return <ChatUI id={id} initialMessages={initialMessages} />;
}
