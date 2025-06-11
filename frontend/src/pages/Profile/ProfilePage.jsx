import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfilePage() {
  const { user, profile, signOut, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  const getInitials = (email) => {
    return email ? email.substring(0, 2).toUpperCase() : '..';
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url} alt={profile?.username || user.email} />
              <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile?.username || 'User Profile'}</CardTitle>
              <CardDescription>Manage your profile information.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Email</h3>
            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
          </div>
          <div>
            <h3 className="font-semibold">User ID</h3>
            <p className="text-gray-600 dark:text-gray-400">{user.id}</p>
          </div>
          <div>
            <h3 className="font-semibold">Full Name</h3>
            <p className="text-gray-600 dark:text-gray-400">{profile?.full_name || 'Not set'}</p>
          </div>
           <div>
            <h3 className="font-semibold">Team ID</h3>
            <p className="text-gray-600 dark:text-gray-400">{profile?.team_id || 'Not assigned'}</p>
          </div>
          <div>
            <h3 className="font-semibold">Joined</h3>
            <p className="text-gray-600 dark:text-gray-400">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <Button onClick={signOut} variant="destructive">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 