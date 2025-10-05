'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { eventsApi, EventFilters } from '@/lib/api/events';
import { Event } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, MapPin, Users, Search, Plus } from 'lucide-react';
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="mt-2 text-gray-600">Browse and register for upcoming college events</p>
        </div>
        {canCreateEvent && (
          <Link href="/events/create">
            <Button variant="primary">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <Button type="submit" variant="primary">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-3">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
          >
            <option value="">All Categories</option>
            <option value="technical">Technical</option>
            <option value="cultural">Cultural</option>
            <option value="sports">Sports</option>
            <option value="literary">Literary</option>
            <option value="management">Management</option>
            <option value="workshop">Workshop</option>
            <option value="seminar">Seminar</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filters.type || ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
          >
            <option value="">All Types</option>
            <option value="inter-college">Inter-College</option>
            <option value="intra-college">Intra-College</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : events.length === 0? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">Try adjusting your filters or search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link key={event._id} href={`/events/${event.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  {event.poster && (
                    <div className="w-full h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                      <img
                        src={event.poster}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary-100 text-primary-800">
                        {event.category}
                      </span>
                      {event.isPaid && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">
                          ₹{event.fee}
                        </span>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2">{event.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      {event.venues && event.venues.length > 0 && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="line-clamp-1">{event.venues[0]}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <span>
                          {event.registeredCountCache || 0}
                          {event.capacity ? ` / ${event.capacity}` : ''} registered
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button variant="primary" className="w-full" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {filters.page} of {totalPages}
              </span>
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
  );
}
