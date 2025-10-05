'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi } from '@/lib/api/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Calendar, Users, TrendingUp, Award } from 'lucide-react';
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
    }
  }, [user, authLoading, router]);

  const fetchDashboardStats = async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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

  const statCards = [
    {
      title: 'Total Events',
      value: stats?.totalEvents || 0,
      description: 'All events in the system',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Upcoming Events',
      value: stats?.upcomingEvents || 0,
      description: 'Events scheduled ahead',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Registered Events',
      value: stats?.registeredEvents || 0,
      description: 'Your active registrations',
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Clubs',
      value: stats?.totalClubs || 0,
      description: 'Active clubs',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user.firstName}!
        </h1>
        <p className="mt-2 text-gray-600">{getRoleBasedWelcome()}</p>
        <div className="mt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.role === 'admin' || user.role === 'organizer' ? (
                <>
                  <Link href="/events/create">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      Create New Event
                    </Button>
                  </Link>
                  <Link href="/events">
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Manage Events
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/events">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      Browse Events
                    </Button>
                  </Link>
                  <Link href="/clubs">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Explore Clubs
                    </Button>
                  </Link>
                </>
              )}
              <Link href="/profile">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  View Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 text-sm">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary-600" />
                    <div className="flex-1">
                      <p className="text-gray-900">{activity.message}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {(user.role === 'admin' || user.role === 'organizer') && (
        <Card>
          <CardHeader>
            <CardTitle>Management Tools</CardTitle>
            <CardDescription>Access advanced features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/events">
                <Button variant="outline" className="w-full">
                  Event Management
                </Button>
              </Link>
              <Link href="/clubs">
                <Button variant="outline" className="w-full">
                  Club Management
                </Button>
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" className="w-full">
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
