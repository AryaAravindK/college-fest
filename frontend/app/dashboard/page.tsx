'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi } from '@/lib/api/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Calendar, Users, TrendingUp, Award, Sparkles, Zap, Star, ArrowRight, Clock, MapPin } from 'lucide-react';
import { DashboardStats } from '@/types';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchDashboardStats();
    }else{
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchDashboardStats = async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (error) {
      console.warn('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleBasedWelcome = () => {
    switch (user.role) {
      case 'admin':
        return 'Welcome back, Admin! Here\'s your system overview.';
      case 'organizer':
        return 'Welcome back! Manage your events and track registrations.';
      case 'faculty':
        return 'Welcome back! Monitor events and student participation.';
      case 'student':
        return 'Welcome back! Discover and register for events.';
      default:
        return 'Welcome to your dashboard!';
    }
  };

  const getRoleEmoji = () => {
    switch (user.role) {
      case 'admin': return '👑';
      case 'organizer': return '📋';
      case 'faculty': return '👨‍🏫';
      case 'student': return '🎓';
      default: return '👤';
    }
  };

  const statCards = [
    {
      title: 'Total Events',
      value: stats?.totalEvents || 0,
      description: 'All events in the system',
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: '+12%',
    },
    {
      title: 'Upcoming Events',
      value: stats?.upcomingEvents || 0,
      description: 'Events scheduled ahead',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      trend: '+8%',
    },
    {
      title: 'Registered Events',
      value: stats?.registeredEvents || 0,
      description: 'Your active registrations',
      icon: Award,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      trend: '+23%',
    },
    {
      title: 'Total Clubs',
      value: stats?.totalClubs || 0,
      description: 'Active clubs',
      icon: Users,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      trend: '+5%',
    },
  ];

  const quickActions = [
    ...(user.role === 'admin' || user.role === 'organizer' ? [
      { 
        href: '/events/create', 
        icon: Sparkles, 
        label: 'Create New Event', 
        description: 'Start organizing',
        color: 'from-purple-500 to-pink-500'
      },
      { 
        href: '/events', 
        icon: TrendingUp, 
        label: 'Manage Events', 
        description: 'View all events',
        color: 'from-blue-500 to-cyan-500'
      },
    ] : [
      { 
        href: '/events', 
        icon: Calendar, 
        label: 'Browse Events', 
        description: 'Discover new events',
        color: 'from-purple-500 to-pink-500'
      },
      { 
        href: '/clubs', 
        icon: Users, 
        label: 'Explore Clubs', 
        description: 'Join communities',
        color: 'from-blue-500 to-cyan-500'
      },
    ]),
    { 
      href: '/profile', 
      icon: Star, 
      label: 'View Profile', 
      description: 'Manage account',
      color: 'from-orange-500 to-red-500'
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in-up">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse animation-delay-1000"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-5xl">{getRoleEmoji()}</div>
                <div>
                  <h1 className="text-4xl font-extrabold">
                    Welcome back, {user.firstName}! 👋
                  </h1>
                  <p className="text-purple-100 text-lg mt-1">{getRoleBasedWelcome()}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-md">
                  <Zap className="h-4 w-4 mr-2" />
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-md">
                  <Clock className="h-4 w-4 mr-2" />
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in-up overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`h-2 bg-gradient-to-r ${stat.color}`}></div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      {stat.trend}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">{stat.title}</h3>
                  <p className="text-4xl font-extrabold text-gray-900 mb-2">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 animate-fade-in-up animation-delay-400">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
                  <p className="text-sm text-gray-600 mt-1">Common tasks and shortcuts</p>
                </div>
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Link key={index} href={action.href}>
                      <div className="group relative overflow-hidden bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 hover:border-transparent rounded-xl p-6 transition-all duration-300 hover:shadow-xl cursor-pointer">
                        <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                        <div className="relative">
                          <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl mb-4 transform group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                            {action.label}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                          <div className="flex items-center text-purple-600 font-semibold text-sm group-hover:gap-2 transition-all">
                            Get started
                            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 animate-fade-in-up animation-delay-600">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                  <p className="text-xs text-gray-600 mt-1">Your latest updates</p>
                </div>
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-4">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer group">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 group-hover:scale-150 transition-transform"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 font-medium group-hover:text-purple-600 transition-colors">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Management Tools (Admin/Organizer) */}
        {(user.role === 'admin' || user.role === 'organizer') && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white animate-fade-in-up animation-delay-800">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Management Tools</h2>
                <p className="text-purple-100">Access advanced features</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/organizer/dashboard">
                <div className="bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-xl p-6 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group">
                  <Calendar className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-lg mb-1">Event Management</h3>
                  <p className="text-sm text-purple-100">Create and manage events</p>
                </div>
              </Link>
              <Link href="/clubs">
                <div className="bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-xl p-6 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group">
                  <Users className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-lg mb-1">Club Management</h3>
                  <p className="text-sm text-purple-100">Organize club activities</p>
                </div>
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin">
                  <div className="bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-xl p-6 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group">
                    <Award className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-lg mb-1">Admin Panel</h3>
                    <p className="text-sm text-purple-100">System administration</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-800 {
          animation-delay: 0.8s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}