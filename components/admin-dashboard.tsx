"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function AdminDashboard({ initialUsers, recentMessages }: { initialUsers: any[], recentMessages: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const supabase = createClient();

  const toggleBlock = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from('profiles').update({ is_blocked: newStatus }).eq('id', userId);
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_blocked: newStatus } : u));
    }
  };

  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).getTime();
  
  const onlineUsers = users.filter(u => u.last_seen && new Date(u.last_seen).getTime() > fiveMinsAgo).length;
  const offlineUsers = users.length - onlineUsers;
  const blockedUsers = users.filter(u => u.is_blocked).length;
  const unblockedUsers = users.length - blockedUsers;

  // Chart Data
  const countryCounts = users.reduce((acc, user) => {
    const c = user.country || 'Unknown';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const countryData = Object.entries(countryCounts).map(([name, value]) => ({ name, value }));

  const stateCounts = users.reduce((acc, user) => {
    const s = user.state || 'Unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const stateData = Object.entries(stateCounts).map(([name, value]) => ({ name, value }));
  
  const tokenData = users.map(u => ({ email: u.email || 'Unknown', used: u.tokens_used || 0 })).sort((a,b) => b.used - a.used).slice(0,10);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 h-screen overflow-y-auto w-full">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader><CardTitle>Online Users</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold">{onlineUsers}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Offline Users</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold">{offlineUsers}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Blocked Users</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold text-destructive">{blockedUsers}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active Users</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold text-green-500">{unblockedUsers}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader><CardTitle>Users by Country</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={countryData} fill="#8884d8" label>
                  {countryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Users by State</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Token Usage</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tokenData} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" />
              <YAxis dataKey="email" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="used" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Tokens Used / Left</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{u.ip_address}</td>
                  <td className="px-4 py-3">{u.country} - {u.state}</td>
                  <td className="px-4 py-3">{u.tokens_used} / {u.tokens_left}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${u.is_blocked ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-500'}`}>
                      {u.is_blocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button 
                      size="sm" 
                      variant={u.is_blocked ? "default" : "destructive"}
                      onClick={() => toggleBlock(u.id, u.is_blocked)}
                      disabled={u.role === 'admin'}
                    >
                      {u.is_blocked ? 'Unblock' : 'Block'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent User Searches/Messages</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {recentMessages.map((msg: any) => (
                <tr key={msg.id} className="border-b">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(msg.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{msg.chats?.profiles?.email || 'Unknown'}</td>
                  <td className="px-4 py-3 max-w-xl truncate">{msg.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
