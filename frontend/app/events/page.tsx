'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { eventsApi, EventFilters } from '@/lib/api/events';
import { Event } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, MapPin, Users, Search, Plus, Filter, Sparkles, TrendingUp, Clock, DollarSign, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>({
    page: 1,
    limit: 12,
    search: '',
  });
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, [filters.page, filters.type, filters.category, filters.status]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await eventsApi.getEvents(filters);
      setEvents(response.events);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      showToast('error', 'Failed to fetch events');
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const canCreateEvent = user && (user.role === 'admin' || user.role === 'organizer');

  const categories = [
    { value: '', label: 'All Categories', icon: '🎯' },
    { value: 'technical', label: 'Technical', icon: '💻' },
    { value: 'cultural', label: 'Cultural', icon: '🎭' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'literary', label: 'Literary', icon: '📚' },
    { value: 'management', label: 'Management', icon: '📊' },
    { value: 'workshop', label: 'Workshop', icon: '🛠️' },
    { value: 'seminar', label: 'Seminar', icon: '🎤' },
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      technical: 'from-blue-500 to-cyan-500',
      cultural: 'from-purple-500 to-pink-500',
      sports: 'from-green-500 to-emerald-500',
      literary: 'from-orange-500 to-red-500',
      management: 'from-indigo-500 to-purple-500',
      workshop: 'from-yellow-500 to-orange-500',
      seminar: 'from-pink-500 to-rose-500',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 12,
      search: '',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 animate-fade-in-up">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse animation-delay-1000"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="h-8 w-8" />
                  <h1 className="text-4xl font-extrabold">Discover Events</h1>
                </div>
                <p className="text-lg text-purple-100">
                  Browse and register for exciting college events
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-md">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {events.length} Events Available
                  </span>
                </div>
              </div>
              {canCreateEvent && (
                <Link href="/events/create">
                  <Button 
                    variant="secondary" 
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-gray-50 shadow-xl"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Event
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8 animate-fade-in-up animation-delay-200">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search events by name, description..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-300"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  variant="primary"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Search
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-8"
                >
                  <Filter className="mr-2 h-5 w-5" />
                  Filters
                </Button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="pt-4 border-t border-gray-200 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                      <select
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        value={filters.category || ''}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
                      >
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Event Type</label>
                      <select
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        value={filters.type || ''}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                      >
                        <option value="">All Types</option>
                        <option value="inter-college">🏫 Inter-College</option>
                        <option value="intra-college">🎓 Intra-College</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        value={filters.status || ''}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                      >
                        <option value="">All Status</option>
                        <option value="published">✅ Published</option>
                        <option value="ongoing">🔄 Ongoing</option>
                        <option value="completed">✔️ Completed</option>
                      </select>
                    </div>
                  </div>
                  
                  {(filters.category || filters.type || filters.status || filters.search) && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {filters.category && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                            {categories.find(c => c.value === filters.category)?.label}
                            <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, category: '' })} />
                          </span>
                        )}
                        {filters.type && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                            {filters.type}
                            <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, type: '' })} />
                          </span>
                        )}
                        {filters.status && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                            {filters.status}
                            <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, status: '' })} />
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm font-semibold text-purple-600 hover:text-pink-600 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading amazing events...</p>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center animate-fade-in-up">
            <Calendar className="mx-auto h-20 w-20 text-gray-300 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters or search criteria</p>
            <Button 
              onClick={clearFilters}
              variant="primary"
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {events.map((event, index) => (
                <Link key={event._id} href={`/events/${event.slug}`}>
                  <div 
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden cursor-pointer animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Image Section */}
                    {event.poster ? (
                      <div className="relative w-full h-48 bg-gradient-to-br from-purple-200 to-pink-200 overflow-hidden">
                        <img
                          src={event.poster}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        {event.isPaid && (
                          <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full font-bold text-green-600 flex items-center gap-1 shadow-lg">
                            <DollarSign className="h-4 w-4" />
                            ₹{event.fee}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`w-full h-48 bg-gradient-to-br ${getCategoryColor(event.category)} flex items-center justify-center`}>
                        <Calendar className="h-16 w-16 text-white opacity-50" />
                      </div>
                    )}

                    {/* Content Section */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(event.category)} text-white`}>
                          {event.category}
                        </span>
                        {event.type && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {event.type}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {event.name}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                          <span className="font-medium">{formatDate(event.startDate)}</span>
                        </div>
                        {event.venues && event.venues.length > 0 && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 text-pink-600" />
                            <span className="line-clamp-1">{event.venues[0]}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2 text-blue-600" />
                          <span>
                            <strong>{event.registeredCountCache || 0}</strong>
                            {event.capacity && ` / ${event.capacity}`} registered
                          </span>
                        </div>
                      </div>

                      <div className={`w-full h-1 bg-gradient-to-r ${getCategoryColor(event.category)} rounded-full mb-4`}></div>

                      <Button 
                        variant="primary" 
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 group-hover:shadow-lg" 
                        size="sm"
                      >
                        View Details
                        <Sparkles className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 animate-fade-in-up">
                <Button
                  variant="outline"
                  disabled={filters.page === 1}
                  onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
                >
                  Previous
                </Button>
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFilters({ ...filters, page: i + 1 })}
                      className={`w-10 h-10 rounded-xl font-semibold transition-all ${
                        filters.page === i + 1
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-110'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  disabled={filters.page === totalPages}
                  onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

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

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}