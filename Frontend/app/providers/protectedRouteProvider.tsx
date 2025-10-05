// components/auth/ProtectedRouteProvider.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

import LoadingOverlay from '@/components/ui/LoadingOverlay';

export default function ProtectedRouteProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/'); // redirect to home page if not authenticated
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (<LoadingOverlay />);
  }

  return <>{children}</>;
}
