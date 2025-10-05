'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Users, Sparkles, TrendingUp, Star, UserPlus, Calendar, Award, Plus, Search } from 'lucide-react';
import { get_clubs } from '@/lib/api/club';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function ClubsPage() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    setIsLoading(true);
    try {
      const data = await get_clubs.getData();
      setClubs(data.clubs || []);
    } catch (err) {
      showToast('error', 'Failed to fetch clubs');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clubCategories = [
    { name: 'Technical', icon: '💻', color: 'from-blue-500 to-cyan-500' },
    { name: 'Cultural', icon: '🎭', color: 'from-purple-500 to-pink-500' },
    { name: 'Sports', icon: '⚽', color: 'from-green-500 to-emerald-500' },
    { name: 'Literary', icon: '📚', color: 'from-orange-500 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 animate-fade-in-up">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse animation-delay-1000"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-8 w-8" />
                <h1 className="text-4xl font-extrabold">Explore Clubs</h1>
              </div>
              <p className="text-lg text-purple-100 mb-6">
                Join amazing communities and make lasting connections
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-md">
                  <Star className="h-4 w-4 mr-2" />
                  {clubs.length}+ Active Clubs
                </span>
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-md">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Growing Community
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Categories */}
        <div className="mb-8 animate-fade-in-up animation-delay-200">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clubs by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-300"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-3">
              {clubCategories.map((category, index) => (
                <button
                  key={index}
                  className={`group px-4 py-2 rounded-xl bg-gradient-to-r ${category.color} text-white font-semibold hover:shadow-lg transition-all transform hover:scale-105`}
                >
                  <span className="text-lg mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clubs Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading clubs...</p>
            </div>
          </div>
        ) : filteredClubs.length === 0 ? (
          <Card className="bg-white rounded-2xl shadow-lg animate-fade-in-up">
            <CardContent className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-6">
                <Users className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {searchQuery ? 'No clubs found' : 'No Clubs Available Yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search criteria' 
                  : 'Be the first to create a club and start building your community!'}
              </p>
              {user?.role === 'organizer' && !searchQuery && (
                <Link href="/auth/register">
                  <Button 
                    variant="primary"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your Club
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club, index) => (
              <Card
                key={club._id || index}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden cursor-pointer animate-fade-in-up group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Club Header with Gradient */}
                <div className={`h-32 bg-gradient-to-r ${clubCategories[index % clubCategories.length].color} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl opacity-50 group-hover:scale-110 transition-transform duration-300">
                      {clubCategories[index % clubCategories.length].icon}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full">
                    <Star className="h-4 w-4 text-white inline mr-1" />
                    <span className="text-white font-bold text-sm">Featured</span>
                  </div>
                </div>

                {/* Club Content */}
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-1">
                      {club.name}
                    </h3>
                    <div className="flex-shrink-0 ml-2">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${clubCategories[index % clubCategories.length].color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Users className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-3 min-h-[60px]">
                    {club.description || 'An amazing club bringing together passionate individuals to create, learn, and grow together.'}
                  </p>

                  {/* Club Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-3 bg-purple-50 rounded-xl">
                      <div className="flex items-center justify-center mb-1">
                        <UserPlus className="h-4 w-4 text-purple-600" />
                      </div>
                      <p className="text-lg font-bold text-purple-600">
                        {Math.floor(Math.random() * 200) + 50}
                      </p>
                      <p className="text-xs text-gray-600">Members</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <div className="flex items-center justify-center mb-1">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <p className="text-lg font-bold text-blue-600">
                        {Math.floor(Math.random() * 20) + 5}
                      </p>
                      <p className="text-xs text-gray-600">Events</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-xl">
                      <div className="flex items-center justify-center mb-1">
                        <Award className="h-4 w-4 text-orange-600" />
                      </div>
                      <p className="text-lg font-bold text-orange-600">
                        {Math.floor(Math.random() * 10) + 1}
                      </p>
                      <p className="text-xs text-gray-600">Awards</p>
                    </div>
                  </div>

                  <div className={`w-full h-1 bg-gradient-to-r ${clubCategories[index % clubCategories.length].color} rounded-full mb-4`}></div>

                  {/* Action Button */}
                  <Button 
                    variant="primary"
                    className={`w-full bg-gradient-to-r ${clubCategories[index % clubCategories.length].color} hover:shadow-lg group-hover:scale-105 transition-transform`}
                    size="sm"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Join Club
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {filteredClubs.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white text-center shadow-xl animate-fade-in-up animation-delay-400">
            <Sparkles className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">Can't find your club?</h2>
            <p className="text-purple-100 text-lg mb-6">
              Start your own club and build an amazing community!
            </p>
            {user?.role === 'organizer' ? (
              <Link href="/auth/register">
                <Button 
                  variant="secondary"
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-gray-50"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your Club
                </Button>
              </Link>
            ) : (
              <p className="text-sm text-purple-200">
                Become an organizer to create your own club
              </p>
            )}
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

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}