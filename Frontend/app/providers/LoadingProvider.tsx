// app/providers/LoadingProvider.tsx
'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

const LoadingContext = createContext({ isLoading: false });

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Adjust to match your animation duration or expected loading time

    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <LoadingContext.Provider value={{ isLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};
