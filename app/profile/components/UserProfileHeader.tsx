'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { LogOut } from 'lucide-react';

interface UserProfileHeaderProps {
  userName: string;
  userEmail: string;
}

export function UserProfileHeader({
  userName,
  userEmail,
}: UserProfileHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-dark-blue font-tango-sans">
            Your Account
          </h1>
          <div className="text-base md:text-lg text-muted-foreground">
            <span className="font-medium">{userName}</span>
            {userEmail && (
              <>
                {' • '}
                <span className="text-brand-secondary">Email: {userEmail}</span>
              </>
            )}
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="default"
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

