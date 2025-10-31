'use client';

import React from 'react';
import { UserProfile } from '../types';

interface UserProfileHeaderProps {
  userName: string;
  userEmail: string;
}

export function UserProfileHeader({
  userName,
  userEmail,
}: UserProfileHeaderProps) {
  return (
    <div className="mb-8 space-y-2">
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
  );
}

