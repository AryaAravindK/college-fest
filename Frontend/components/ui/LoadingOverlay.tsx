// components/LoadingOverlay.tsx
'use client';

import { useLoading } from '@/app/providers/LoadingProvider';

const LoadingOverlay = () => {
  const { isLoading } = useLoading();

  return isLoading ? (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[9999] transition-opacity">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-600 border-opacity-50"></div>
    </div>
  ) : null;
};

export default LoadingOverlay;
