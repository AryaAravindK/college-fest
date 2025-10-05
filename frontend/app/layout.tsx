import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "College Fest Management System",
  description: "Manage your college events, clubs, and registrations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50">
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            <main className="min-h-[calc(100vh-64px)]">
              {children}
            </main>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
