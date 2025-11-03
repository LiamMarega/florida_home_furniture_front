'use client';

import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import LoginForm from './login-form';
import RegisterForm from './register-form';

const AuthModal: React.FC = () => {
  const { authModalOpen, closeAuthModal, authModalView, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'login' | 'register'>(authModalView);

  // Update tab when authModalView changes
  useEffect(() => {
    setActiveTab(authModalView);
  }, [authModalView]);

  const handleTabChange = (value: string) => {
    if (value === 'login' || value === 'register') {
      openAuthModal(value);
      setActiveTab(value);
    }
  };

  return (
    <Dialog open={authModalOpen} onOpenChange={closeAuthModal}>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold">
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 px-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="px-6 pb-6 mt-0">
            <LoginForm />
          </TabsContent>

          <TabsContent value="register" className="px-6 pb-6 mt-0">
            <RegisterForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;

