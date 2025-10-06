'use client'
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Calendar, MapPin, Users, Clock, DollarSign, Share2, 
  Heart, Edit2, Trash2, Plus, X, Save, Award, Bell,
  TrendingUp, FileText, CheckCircle, XCircle, Sparkles,
  ChevronRight, Download, Upload, Eye, AlertCircle
} from 'lucide-react';

import { eventsApi } from '@/lib/api/events';

// Mock API calls - replace with actual API
const mockEventData = {
  _id: '68e222a1e64bd1e105cebeb0',
  title: 'Startup Pitch Fest',
  slug: 'startup-pitch-fest',
  description: 'Pitch your startup idea to real investors. This is an amazing opportunity to showcase your innovative ideas and get funding from top venture capitalists.',
  poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  type: 'inter-college',
  mode: 'offline',
  status: 'published',
  category: 'management',
  startDate: new Date('2025-12-05T09:00:00.000Z'),
  endDate: new Date('2025-12-05T13:00:00.000Z'),
  registrationDeadline: new Date('2025-12-01T23:59:59.000Z'),
  venues: ['Silicon Valley Hub', 'Main Auditorium'],
  capacity: 100,
  registeredCountCache: 67,
  isPaid: true,
  fee: 500,
  organizer: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  coordinators: [
    { _id: '1', firstName: 'Alice', lastName: 'Smith' },
    { _id: '2', firstName: 'Bob', lastName: 'Johnson' }
  ]
};

const mockSponsors = [
  { _id: '1', name: 'TechCorp', logo: 'https://via.placeholder.com/100', tier: 'platinum', website: 'https://techcorp.com' },
  { _id: '2', name: 'InnovateLabs', logo: 'https://via.placeholder.com/100', tier: 'gold', website: 'https://innovate.com' }
];

const mockAnnouncements = [
  { _id: '1', title: 'Registration Extended', description: 'Deadline extended to Dec 1st', priority: 'high', createdAt: new Date() },
  { _id: '2', title: 'Venue Change', description: 'Event moved to Main Auditorium', priority: 'medium', createdAt: new Date() }
];

const mockRegistrations = [
  { _id: '1', student: { firstName: 'Emma', lastName: 'Wilson', email: 'emma@example.com' }, status: 'confirmed', registeredAt: new Date() },
  { _id: '2', student: { firstName: 'Michael', lastName: 'Brown', email: 'michael@example.com' }, status: 'pending', registeredAt: new Date() }
];

const mockResults = [
  { _id: '1', student: { firstName: 'Emma', lastName: 'Wilson' }, rank: 1, score: 95, award: 'First Prize - $10,000' },
  { _id: '2', student: { firstName: 'Michael', lastName: 'Brown' }, rank: 2, score: 88, award: 'Second Prize - $5,000' }
];



// Main Component
export default function EventDetailsPage() {

  const { slug } = useParams(); 
  const [event, setEvent] = useState(mockEventData);
  const [activeTab, setActiveTab] = useState('overview');
  const [isOrganizer, setIsOrganizer] = useState(true); // Mock user role
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  
  // Modal states
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Data states
  const [sponsors, setSponsors] = useState(mockSponsors);
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [registrations, setRegistrations] = useState(mockRegistrations);
  const [results, setResults] = useState(mockResults);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      technical: 'from-blue-500 to-cyan-500',
      cultural: 'from-purple-500 to-pink-500',
      sports: 'from-green-500 to-emerald-500',
      literary: 'from-orange-500 to-red-500',
      management: 'from-indigo-500 to-purple-500'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const handleRegister = async () => {
    // API call to register
    setIsRegistered(true);
    alert('Registration successful!');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'sponsors', label: 'Sponsors', icon: Award },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'registrations', label: 'Registrations', icon: Users, organizerOnly: true },
    { id: 'results', label: 'Results', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero Section */}
      <div className="relative h-96 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={event.poster}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col justify-end pb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-4 py-2 rounded-full text-white font-bold text-sm bg-gradient-to-r ${getCategoryColor(event.category)}`}>
              {event.category}
            </span>
            <span className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white font-semibold text-sm">
              {event.type}
            </span>
            <span className={`px-4 py-2 rounded-full font-semibold text-sm ${
              event.status === 'published' ? 'bg-green-500/20 text-green-300' :
              event.status === 'ongoing' ? 'bg-blue-500/20 text-blue-300' :
              event.status === 'completed' ? 'bg-gray-500/20 text-gray-300' :
              'bg-yellow-500/20 text-yellow-300'
            }`}>
              {event.status}
            </span>
          </div>
          
          <h1 className="text-5xl font-extrabold text-white mb-4">{event.title}</h1>
          
          <div className="flex flex-wrap items-center gap-6 text-white/90">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">{formatDate(event.startDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">{event.venues[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-medium">{event.registeredCountCache} / {event.capacity} registered</span>
            </div>
            {event.isPaid && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="font-bold">₹{event.fee}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-3">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`p-3 rounded-full backdrop-blur-md transition-all ${
              isLiked ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all">
            <Share2 className="h-5 w-5" />
          </button>
          {isOrganizer && (
            <button 
              onClick={() => setShowEditModal(true)}
              className="p-3 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-all"
            >
              <Edit2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                if (tab.organizerOnly && !isOrganizer) return null;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <OverviewTab 
                event={event} 
                isRegistered={isRegistered}
                isOrganizer={isOrganizer}
                onRegister={handleRegister}
              />
            )}
            
            {activeTab === 'sponsors' && (
              <SponsorsTab
                sponsors={sponsors}
                setSponsors={setSponsors}
                isOrganizer={isOrganizer}
                onOpenModal={() => setShowSponsorModal(true)}
              />
            )}
            
            {activeTab === 'announcements' && (
              <AnnouncementsTab
                announcements={announcements}
                setAnnouncements={setAnnouncements}
                isOrganizer={isOrganizer}
                onOpenModal={() => setShowAnnouncementModal(true)}
              />
            )}
            
            {activeTab === 'registrations' && isOrganizer && (
              <RegistrationsTab
                registrations={registrations}
                setRegistrations={setRegistrations}
              />
            )}
            
            {activeTab === 'results' && (
              <ResultsTab
                results={results}
                setResults={setResults}
                isOrganizer={isOrganizer}
                onOpenModal={() => setShowResultModal(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSponsorModal && (
        <SponsorModal
          onClose={() => setShowSponsorModal(false)}
          onSave={(sponsor) => {
            setSponsors([...sponsors, { ...sponsor, _id: Date.now().toString() }]);
            setShowSponsorModal(false);
          }}
        />
      )}

      {showAnnouncementModal && (
        <AnnouncementModal
          onClose={() => setShowAnnouncementModal(false)}
          onSave={(announcement) => {
            setAnnouncements([...announcements, { ...announcement, _id: Date.now().toString(), createdAt: new Date() }]);
            setShowAnnouncementModal(false);
          }}
        />
      )}

      {showResultModal && (
        <ResultModal
          onClose={() => setShowResultModal(false)}
          onSave={(result) => {
            setResults([...results, { ...result, _id: Date.now().toString() }]);
            setShowResultModal(false);
          }}
        />
      )}

      {showEditModal && (
        <EditEventModal
          event={event}
          onClose={() => setShowEditModal(false)}
          onSave={(updatedEvent) => {
            setEvent(updatedEvent);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ event, isRegistered, isOrganizer, onRegister }) {
  const daysUntilEvent = Math.ceil((new Date(event.startDate) - new Date()) / (1000 * 60 * 60 * 24));
  const registrationOpen = new Date() < new Date(event.registrationDeadline);
  const spotsLeft = event.capacity - event.registeredCountCache;

  return (
    <div className="space-y-8">
      {/* Registration CTA */}
      {!isOrganizer && registrationOpen && !isRegistered && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Register Now!</h3>
              <p className="text-purple-100 mb-1">
                Only {spotsLeft} spots remaining • Registration closes in {Math.ceil((new Date(event.registrationDeadline) - new Date()) / (1000 * 60 * 60 * 24))} days
              </p>
              <p className="text-lg font-semibold">Event starts in {daysUntilEvent} days</p>
            </div>
            <button
              onClick={onRegister}
              className="px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
            >
              Register Now <ChevronRight className="inline h-5 w-5 ml-1" />
            </button>
          </div>
        </div>
      )}

      {isRegistered && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="text-xl font-bold text-green-900">You're Registered!</h3>
              <p className="text-green-700">We'll send you updates about this event</p>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-600" />
          About This Event
        </h2>
        <p className="text-gray-700 leading-relaxed text-lg">{event.description}</p>
      </div>

      {/* Event Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Date & Time</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-500 rounded-lg">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Venue</p>
              <p className="text-lg font-bold text-gray-900">{event.venues[0]}</p>
              {event.mode === 'hybrid' && (
                <span className="text-sm text-purple-600 font-semibold">Also available online</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-500 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Capacity</p>
              <p className="text-lg font-bold text-gray-900">{event.registeredCountCache} / {event.capacity} Registered</p>
              <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${(event.registeredCountCache / event.capacity) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-500 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Registration Deadline</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(event.registrationDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
              <p className="text-sm text-orange-600 font-semibold">
                {registrationOpen ? `${Math.ceil((new Date(event.registrationDeadline) - new Date()) / (1000 * 60 * 60 * 24))} days left` : 'Closed'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Organizer Info */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Organized By</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {event.organizer.firstName[0]}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{event.organizer.firstName} {event.organizer.lastName}</p>
            <p className="text-gray-600">{event.organizer.email}</p>
          </div>
        </div>
        
        {event.coordinators && event.coordinators.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-600 mb-2">Coordinators</p>
            <div className="flex flex-wrap gap-2">
              {event.coordinators.map((coord) => (
                <span key={coord._id} className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-200">
                  {coord.firstName} {coord.lastName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sponsors Tab Component
function SponsorsTab({ sponsors, setSponsors, isOrganizer, onOpenModal }) {
  const tierColors = {
    platinum: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-yellow-600',
    silver: 'from-gray-300 to-gray-500',
    bronze: 'from-orange-400 to-orange-600'
  };

  const deleteSponsor = (id) => {
    if (window.confirm('Delete this sponsor?')) {
      setSponsors(sponsors.filter(s => s._id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Event Sponsors</h2>
        {isOrganizer && (
          <button
            onClick={onOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            <Plus className="h-5 w-5" />
            Add Sponsor
          </button>
        )}
      </div>

      {sponsors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No sponsors yet</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sponsors.map((sponsor) => (
            <div key={sponsor._id} className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-white text-xs font-bold bg-gradient-to-r ${tierColors[sponsor.tier]}`}>
                  {sponsor.tier.toUpperCase()}
                </div>
                {isOrganizer && (
                  <button
                    onClick={() => deleteSponsor(sponsor._id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center justify-center h-24 mb-4 bg-gray-50 rounded-lg">
                <img src={sponsor.logo} alt={sponsor.name} className="max-h-20 max-w-full object-contain" />
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">{sponsor.name}</h3>
              
              {sponsor.website && (
                <a
                  href={sponsor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                >
                  Visit Website <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Announcements Tab Component
function AnnouncementsTab({ announcements, setAnnouncements, isOrganizer, onOpenModal }) {
  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const deleteAnnouncement = (id) => {
    if (window.confirm('Delete this announcement?')) {
      setAnnouncements(announcements.filter(a => a._id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
        {isOrganizer && (
          <button
            onClick={onOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            <Plus className="h-5 w-5" />
            New Announcement
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement._id} className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${priorityColors[announcement.priority]}`}>
                      {announcement.priority.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{announcement.title}</h3>
                  <p className="text-gray-700">{announcement.description}</p>
                </div>
                {isOrganizer && (
                  <button
                    onClick={() => deleteAnnouncement(announcement._id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Registrations Tab Component
function RegistrationsTab({ registrations, setRegistrations }) {
  const [filter, setFilter] = useState('all');

  const updateStatus = (id, newStatus) => {
    setRegistrations(registrations.map(r => 
      r._id === id ? { ...r, status: newStatus } : r
    ));
  };

  const filteredRegistrations = filter === 'all' 
    ? registrations 
    : registrations.filter(r => r.status === filter);

  const statusCounts = {
    all: registrations.length,
    confirmed: registrations.filter(r => r.status === 'confirmed').length,
    pending: registrations.filter(r => r.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Registrations</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all">
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-xl text-left transition-all ${
            filter === 'all' ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
          }`}
        >
          <p className="text-sm text-gray-600 font-medium">Total Registrations</p>
          <p className="text-3xl font-bold text-gray-900">{statusCounts.all}</p>
        </button>
        
        <button
          onClick={() => setFilter('confirmed')}
          className={`p-4 rounded-xl text-left transition-all ${
            filter === 'confirmed' ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
          }`}
        >
          <p className="text-sm text-gray-600 font-medium">Confirmed</p>
          <p className="text-3xl font-bold text-green-600">{statusCounts.confirmed}</p>
        </button>
        
        <button
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-xl text-left transition-all ${
            filter === 'pending' ? 'bg-yellow-100 border-2 border-yellow-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
          }`}
        >
          <p className="text-sm text-gray-600 font-medium">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">{statusCounts.pending}</p>
        </button>
      </div>

      {/* Registrations List */}
      <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Student</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Registered</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((reg, index) => (
                <tr key={reg._id} className={`border-b border-gray-100 hover:bg-gray-50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {reg.student.firstName[0]}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {reg.student.firstName} {reg.student.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{reg.student.email}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {new Date(reg.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      reg.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      reg.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {reg.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {reg.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(reg._id, 'confirmed')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Confirm"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Cancel this registration?')) {
                            updateStatus(reg._id, 'cancelled');
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Cancel"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Results Tab Component
function ResultsTab({ results, setResults, isOrganizer, onOpenModal }) {
  const deleteResult = (id) => {
    if (window.confirm('Delete this result?')) {
      setResults(results.filter(r => r._id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Results & Winners</h2>
        {isOrganizer && (
          <button
            onClick={onOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            <Plus className="h-5 w-5" />
            Add Result
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No results published yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={result._id} className={`bg-gradient-to-r ${
              result.rank === 1 ? 'from-yellow-50 to-yellow-100 border-yellow-300' :
              result.rank === 2 ? 'from-gray-50 to-gray-100 border-gray-300' :
              result.rank === 3 ? 'from-orange-50 to-orange-100 border-orange-300' :
              'from-white to-gray-50 border-gray-200'
            } border-2 rounded-xl p-6 hover:shadow-lg transition-all group`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${
                    result.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                    result.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-600 text-white' :
                    result.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                    'bg-gradient-to-br from-purple-400 to-pink-400 text-white'
                  }`}>
                    {result.rank === 1 ? '🥇' :
                     result.rank === 2 ? '🥈' :
                     result.rank === 3 ? '🥉' :
                     `#${result.rank}`}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {result.student.firstName} {result.student.lastName}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-700">
                        <strong>Score:</strong> {result.score}
                      </span>
                      {result.award && (
                        <span className="px-3 py-1 bg-white rounded-full font-semibold text-purple-600 border border-purple-200">
                          {result.award}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={()=>{console.log("certificate")}}
                  className="opacity-80 group-hover:opacity-100 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    Download certificate
                </button>
                {isOrganizer && (
                  <button
                    onClick={() => deleteResult(result._id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sponsor Modal Component
function SponsorModal({ onClose, onSave, sponsor = null }) {
  const [formData, setFormData] = useState({
    name: sponsor?.name || '',
    logo: sponsor?.logo || '',
    tier: sponsor?.tier || 'bronze',
    website: sponsor?.website || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Add Sponsor</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sponsor Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Logo URL</label>
            <input
              type="url"
              value={formData.logo}
              onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tier</label>
            <select
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="platinum">Platinum</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Website (optional)</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Announcement Modal Component
function AnnouncementModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">New Announcement</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Publish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Result Modal Component
function ResultModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    student: { firstName: '', lastName: '' },
    rank: '',
    score: '',
    award: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Add Result</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={formData.student.firstName}
                onChange={(e) => setFormData({ ...formData, student: { ...formData.student, firstName: e.target.value } })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.student.lastName}
                onChange={(e) => setFormData({ ...formData, student: { ...formData.student, lastName: e.target.value } })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rank</label>
              <input
                type="number"
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Score</label>
              <input
                type="number"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Award</label>
            <input
              type="text"
              value={formData.award}
              onChange={(e) => setFormData({ ...formData, award: e.target.value })}
              placeholder="e.g., First Prize - $10,000"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Save Result
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Event Modal Component
function EditEventModal({ event, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description,
    startDate: event.startDate.toISOString().slice(0, 16),
    endDate: event.endDate.toISOString().slice(0, 16),
    capacity: event.capacity,
    fee: event.fee
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...event,
      ...formData,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Edit Event</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Event Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fee (₹)</label>
              <input
                type="number"
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="0"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}