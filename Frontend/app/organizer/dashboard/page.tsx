'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Users, TrendingUp, DollarSign, Plus, Edit2, Trash2,
  Eye, MoreVertical, Search, Filter, Download, BarChart3,
  Sparkles, AlertCircle, CheckCircle, Clock, XCircle, Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';



// Mock data - replace with API calls
const mockEvents = [
  {
    _id: '1',
    title: 'Startup Pitch Fest',
    slug: 'startup-pitch-fest',
    status: 'published',
    category: 'management',
    startDate: new Date('2025-12-05'),
    registeredCountCache: 67,
    capacity: 100,
    isPaid: true,
    fee: 500,
    revenue: 33500
  },
  {
    _id: '2',
    title: 'AI Hackathon 2024',
    slug: 'ai-hackathon-2024',
    status: 'ongoing',
    category: 'technical',
    startDate: new Date('2025-11-20'),
    registeredCountCache: 45,
    capacity: 50,
    isPaid: true,
    fee: 300,
    revenue: 13500
  },
  {
    _id: '3',
    title: 'Cultural Night',
    slug: 'cultural-night',
    status: 'completed',
    category: 'cultural',
    startDate: new Date('2025-10-15'),
    registeredCountCache: 200,
    capacity: 200,
    isPaid: false,
    fee: 0,
    revenue: 0
  },
  {
    _id: '4',
    title: 'Photography Workshop',
    slug: 'photography-workshop',
    status: 'draft',
    category: 'workshop',
    startDate: new Date('2025-12-20'),
    registeredCountCache: 0,
    capacity: 30,
    isPaid: true,
    fee: 200,
    revenue: 0
  }
];

export default function OrganizerDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState(mockEvents);
  const [filteredEvents, setFilteredEvents] = useState(mockEvents);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMenu, setShowMenu] = useState(null);

  const stats = {
    totalEvents: events.length,
    activeEvents: events.filter(e => e.status === 'published' || e.status === 'ongoing').length,
    totalRegistrations: events.reduce((sum, e) => sum + e.registeredCountCache, 0),
    totalRevenue: events.reduce((sum, e) => sum + e.revenue, 0)
  };
    const { user } = useAuth();
    const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  useEffect(() => {
    if (!isOrganizer || user === null || user === undefined) {
      router.push('/auth/login');
    }
    let filtered = events;

    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    setFilteredEvents(filtered);
  }, [searchQuery, statusFilter, events]);

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      published: 'bg-green-100 text-green-800 border-green-200',
      ongoing: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-purple-100 text-purple-800 border-purple-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: Clock,
      published: CheckCircle,
      ongoing: TrendingUp,
      completed: Award,
      cancelled: XCircle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      technical: 'from-blue-500 to-cyan-500',
      cultural: 'from-purple-500 to-pink-500',
      sports: 'from-green-500 to-emerald-500',
      literary: 'from-orange-500 to-red-500',
      management: 'from-indigo-500 to-purple-500',
      workshop: 'from-yellow-500 to-orange-500'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const handleDelete = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(e => e._id !== eventId));
      alert('Event deleted successfully!');
    }
  };

  const handleDuplicate = (event) => {
    const duplicated = {
      ...event,
      _id: Date.now().toString(),
      title: `${event.title} (Copy)`,
      slug: `${event.slug}-copy`,
      status: 'draft',
      registeredCountCache: 0,
      revenue: 0
    };
    setEvents([duplicated, ...events]);
    alert('Event duplicated successfully!');
  };

  const exportToCSV = () => {
    alert('Exporting events to CSV...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-600" />
              <h1 className="text-4xl font-extrabold text-gray-900">Event Management</h1>
            </div>
            <button
              onClick={() => router.push('/events/create')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Plus className="h-5 w-5" />
              Create Event
            </button>
          </div>
          <p className="text-lg text-gray-600">Manage your events and track performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">Total Events</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">Active Events</p>
            <p className="text-3xl font-bold text-gray-900">{stats.activeEvents}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">Total Registrations</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalRegistrations}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-purple-500 hover:text-purple-600 transition-all"
              >
                <Download className="h-5 w-5" />
                Export
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter !== 'all') && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-600">Active Filters:</span>
              {searchQuery && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold flex items-center gap-2">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-purple-900">
                    <XCircle className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold flex items-center gap-2">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-blue-900">
                    <XCircle className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Events Found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Create your first event to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <button
                  onClick={() => router.push('/events/create')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  <Plus className="inline h-5 w-5 mr-2" />
                  Create Your First Event
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Event</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Registrations</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Revenue</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event, index) => (
                    <tr
                      key={event._id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-all ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      {/* Event Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-12 rounded-full bg-gradient-to-b ${getCategoryColor(event.category)}`}></div>
                          <div>
                            <p className="font-bold text-gray-900">{event.title}</p>
                            <p className="text-sm text-gray-600 capitalize">{event.category}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(event.status)}`}>
                          {getStatusIcon(event.status)}
                          {event.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {event.startDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-600">
                          {Math.ceil((event.startDate - new Date()) / (1000 * 60 * 60 * 24))} days away
                        </p>
                      </td>

                      {/* Registrations */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">
                              {event.registeredCountCache} / {event.capacity}
                            </p>
                            <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                style={{ width: `${(event.registeredCountCache / event.capacity) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="px-6 py-4">
                        {event.isPaid ? (
                          <p className="text-sm font-bold text-green-600">
                            ₹{event.revenue.toLocaleString()}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">Free Event</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 relative">
                          <button
                            onClick={() => router.push(`/events/${event.slug}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Event"
                          >
                            <Eye className="h-5 w-5" />
                          </button>

                          <button
                            onClick={() => router.push(`/events/${event.slug}/edit`)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                            title="Edit Event"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setShowMenu(showMenu === event._id ? null : event._id)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                              title="More Options"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>

                            {showMenu === event._id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setShowMenu(null)}
                                ></div>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border-2 border-gray-100 z-20 overflow-hidden">
                                  <button
                                    onClick={() => {
                                      handleDuplicate(event);
                                      setShowMenu(null);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-all flex items-center gap-3 text-sm font-semibold text-gray-700"
                                  >
                                    <BarChart3 className="h-4 w-4" />
                                    View Analytics
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDuplicate(event);
                                      setShowMenu(null);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-all flex items-center gap-3 text-sm font-semibold text-gray-700"
                                  >
                                    <Calendar className="h-4 w-4" />
                                    Duplicate Event
                                  </button>
                                  <button
                                    onClick={() => {
                                      alert('Exporting registrations...');
                                      setShowMenu(null);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-all flex items-center gap-3 text-sm font-semibold text-gray-700"
                                  >
                                    <Download className="h-4 w-4" />
                                    Export Registrations
                                  </button>
                                  <div className="border-t border-gray-100"></div>
                                  <button
                                    onClick={() => {
                                      handleDelete(event._id);
                                      setShowMenu(null);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-red-50 transition-all flex items-center gap-3 text-sm font-semibold text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Event
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Stats Section */}
        {filteredEvents.length > 0 && (
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Top Performing Event</h3>
              {(() => {
                const topEvent = [...filteredEvents].sort((a, b) => b.registeredCountCache - a.registeredCountCache)[0];
                return (
                  <div>
                    <p className="text-2xl font-extrabold mb-1">{topEvent.title}</p>
                    <p className="text-purple-100">{topEvent.registeredCountCache} registrations</p>
                  </div>
                );
              })()}
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Upcoming Events</h3>
              <div>
                <p className="text-4xl font-extrabold mb-1">
                  {filteredEvents.filter(e => e.startDate > new Date() && (e.status === 'published' || e.status === 'ongoing')).length}
                </p>
                <p className="text-blue-100">Events scheduled</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Average Fill Rate</h3>
              {(() => {
                const avgFill = filteredEvents.reduce((sum, e) => sum + (e.registeredCountCache / e.capacity), 0) / filteredEvents.length;
                return (
                  <div>
                    <p className="text-4xl font-extrabold mb-1">{Math.round(avgFill * 100)}%</p>
                    <p className="text-green-100">Capacity filled</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Tips Card */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-600 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Pro Tips for Better Events</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Publish events at least 2 weeks in advance for better reach</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Use high-quality posters to attract more participants</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Send regular announcements to keep participants engaged</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Collect feedback after events to improve future planning</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}