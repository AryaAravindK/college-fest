'use client';

import React, { useState,useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, User, LogOut, Calendar, Users, Home, LayoutDashboard, Sparkles, Bell, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/cn';
import Button from '@/components/ui/Button';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();


  const publicLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/events', label: 'Events', icon: Calendar },
  ];

  const authenticatedLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/clubs', label: 'Clubs', icon: Users },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Admin', icon: Settings },
  ];

  const links = user
    ? [
        ...authenticatedLinks,
        ...(user.role === 'admin' ? adminLinks : []),
      ]
    : publicLinks;

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'from-red-500 to-orange-500',
      organizer: 'from-purple-500 to-pink-500',
      faculty: 'from-blue-500 to-cyan-500',
      student: 'from-green-500 to-emerald-500',
      public: 'from-gray-500 to-gray-600',
    };
    return colors[role] || 'from-purple-500 to-pink-500';
  };

  const getRoleEmoji = (role: string) => {
    const emojis: Record<string, string> = {
      admin: '👑',
      organizer: '📋',
      faculty: '👨‍🏫',
      student: '🎓',
      public: '👤',
    };
    return emojis[role] || '👤';
  };


  console.log("user;",user)
  return (
    <nav className="bg-white/80 backdrop-blur-lg shadow-lg sticky top-0 z-50 border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur-sm group-hover:blur-md transition-all"></div>
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-xl transform group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                CollegeFest
              </span>
              <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-2">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300',
                      isActive
                        ? 'text-purple-600'
                        : 'text-gray-700 hover:text-purple-600'
                    )}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl"></div>
                    )}
                    <Icon className={cn(
                      "h-4 w-4 mr-2 relative z-10",
                      isActive && "animate-bounce"
                    )} />
                    <span className="relative z-10">{link.label}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop User Section */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {user ? (
              <>
                <button className="relative p-2 text-gray-700 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-all">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-purple-50 transition-all group"
                  >
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {user?.firstName}
                      </div>
                      <div className={`text-xs font-medium bg-gradient-to-r ${getRoleColor(user.role)} bg-clip-text text-transparent`}>
                        {user?.role}
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getRoleColor(user.role)} flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform`}>
                      {getRoleEmoji(user.role)}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-fade-in">
                      <Link
                        href="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                      >
                        <User className="h-4 w-4 mr-3" />
                        View Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings
                      </Link>
                      <div className="border-t border-gray-100 my-2"></div>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="hover:bg-purple-50 hover:text-purple-600">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </>) }
            
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-all"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-purple-100 bg-white/95 backdrop-blur-lg animate-fade-in">
          <div className="px-4 pt-4 pb-3 space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center px-4 py-3 rounded-xl text-base font-semibold transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600'
                      : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {link.label}
                  {isActive && <Sparkles className="h-4 w-4 ml-auto text-purple-600" />}
                </Link>
              );
            })}
          </div>

          <div className="pt-4 pb-3 border-t border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
            {user ? (
              <div className="px-4 space-y-2">
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getRoleColor(user.role)} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                    {getRoleEmoji(user.role)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{user.firstName}</div>
                    <div className={`text-xs font-semibold bg-gradient-to-r ${getRoleColor(user.role)} bg-clip-text text-transparent`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </div>
                  </div>
                </div>
                <Link
                  href="/profile"
                  className="flex items-center px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-white hover:text-purple-600 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5 mr-3" />
                  Profile
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="px-4 space-y-2">
                <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-base hover:bg-white">
                    <User className="h-5 w-5 mr-3" />
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    variant="primary" 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-base"
                  >
                    <Sparkles className="h-5 w-5 mr-3" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;