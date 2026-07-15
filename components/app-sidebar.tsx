"use client";

import * as React from "react"
import {
  MessageSquare,
  LogOut,
  LogIn,
  ShieldAlert
} from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { signOut } from "@/app/login/actions"
import { createClient } from "@/lib/supabase/client"
import { isToday, subDays, isAfter } from "date-fns"
import { useRouter, usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"

type Chat = {
  id: string;
  title: string;
  updated_at: string;
}

type GroupedChats = {
  title: string;
  items: Chat[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [groupedChats, setGroupedChats] = React.useState<GroupedChats[]>([])
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const supabase = createClient()
    
    async function loadData(currentUser: User) {
      // Check admin
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single()
      setIsAdmin(profile?.role === 'admin')

      // Fetch chats
      const { data: chats } = await supabase.from('chats').select('id, title, updated_at').eq('user_id', currentUser.id).order('updated_at', { ascending: false })
      
      if (chats) {
        const today: Chat[] = []
        const previous7Days: Chat[] = []
        const older: Chat[] = []
        
        const sevenDaysAgo = subDays(new Date(), 7)

        chats.forEach(chat => {
          const date = new Date(chat.updated_at)
          if (isToday(date)) today.push(chat)
          else if (isAfter(date, sevenDaysAgo)) previous7Days.push(chat)
          else older.push(chat)
        })

        const groups = []
        if (today.length > 0) groups.push({ title: "Today", items: today })
        if (previous7Days.length > 0) groups.push({ title: "Previous 7 Days", items: previous7Days })
        if (older.length > 0) groups.push({ title: "Older", items: older })
        
        setGroupedChats(groups)
      }
    }

    let currentUser: User | null = null;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      currentUser = data.user;
      if (data.user) loadData(data.user)
    })

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      currentUser = session?.user ?? null;
      if (session?.user) {
        loadData(session.user)
      } else {
        setGroupedChats([])
        setIsAdmin(false)
      }
    })

    // Realtime: refresh chat list whenever a chat is inserted or updated
    const chatsSub = supabase
      .channel('sidebar-chats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, () => {
        if (currentUser) loadData(currentUser)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats' }, () => {
        if (currentUser) loadData(currentUser)
      })
      .subscribe()

    return () => {
      authSub.unsubscribe()
      supabase.removeChannel(chatsSub)
    }
  }, [])

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => router.push('/')}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <MessageSquare className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">New Chat</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groupedChats.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                   <SidebarMenuItem key={item.id}>
                     <SidebarMenuButton 
                        onClick={() => router.push(`/chat/${item.id}`)}
                        isActive={pathname === `/chat/${item.id}`}
                     >
                       {item.title}
                     </SidebarMenuButton>
                   </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => router.push('/admin')}>
                <ShieldAlert className="size-4" />
                <span>Admin Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          {user ? (
            <SidebarMenuItem>
              <form action={signOut}>
                <SidebarMenuButton type="submit" className="w-full justify-start cursor-pointer">
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </form>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => router.push('/login')}>
                <LogIn className="size-4" />
                <span>Sign in</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
