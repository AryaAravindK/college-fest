'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { usersApi } from '@/lib/api/users';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { User, Mail, Phone, Calendar, Award, Edit2, Save, X, Sparkles, TrendingUp, Users as UsersIcon, Camera, MapPin, Briefcase, GraduationCap } from 'lucide-react';

export default function ProfilePage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    department: '',
    year: '',
  });
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    console.log('User not authenticated, redirecting to login.');
    if (!authLoading && !authUser) {
      console.log('User not authenticated, redirecting to login.');
          if (router.asPath !== '/auth/login') {
      router.push('/auth/login');
    }
      return;
    }

    if (authUser) {
      setFormData({
        firstName: authUser.firstName || '',
        lastName: authUser.lastName || '',
        phone: authUser.phone || '',
        bio: authUser.bio || '',
        department: authUser.department || '',
        year: authUser.year?.toString() || '',
      });
    }else{
      router.push('/auth/login');
    }
  }, [authUser, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    setIsSaving(true);
    try {
      await usersApi.updateUserProfile(authUser._id, {
        ...formData,
        year: formData.year ? parseInt(formData.year) : undefined,
      });
      showToast('success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      showToast('error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !authUser) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const getRoleColor = () => {
    const colors: Record<string, string> = {
      admin: 'from-red-500 to-orange-500',
      organizer: 'from-purple-500 to-pink-500',
      faculty: 'from-blue-500 to-cyan-500',
      student: 'from-green-500 to-emerald-500',
      public: 'from-gray-500 to-gray-600',
    };
    return colors[authUser.role] || 'from-purple-500 to-pink-500';
  };

  const getRoleEmoji = () => {
    const emojis: Record<string, string> = {
      admin: '👑',
      organizer: '📋',
      faculty: '👨‍🏫',
      student: '🎓',
      public: '👤',
    };
    return emojis[authUser.role] || '👤';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl font-extrabold text-gray-900">My Profile</h1>
          </div>
          <p className="text-lg text-gray-600">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Overview Card */}
            <Card className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
              {/* Cover Image */}
              <div className={`h-32 bg-gradient-to-r ${getRoleColor()} relative`}>
                <div className="absolute inset-0 bg-black/10"></div>
                <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all">
                  <Camera className="h-4 w-4 text-white" />
                </button>
              </div>

              <CardContent className="pt-0 pb-6 text-center relative">
                {/* Profile Picture */}
                <div className="relative -mt-16 mb-4">
                  <div className={`w-32 h-32 mx-auto rounded-2xl bg-gradient-to-r ${getRoleColor()} flex items-center justify-center shadow-2xl ring-4 ring-white`}>
                    {authUser.profilePic ? (
                      <img
                        src={authUser.profilePic}
                        alt={authUser.firstName}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      <span className="text-5xl">{getRoleEmoji()}</span>
                    )}
                  </div>
                  <button className="absolute bottom-0 right-1/2 translate-x-16 p-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all border-2 border-gray-100">
                    <Camera className="h-4 w-4 text-purple-600" />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {authUser.firstName} {authUser.lastName}
                </h2>
                <p className="text-sm text-gray-600 mb-3 flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" />
                  {authUser.email}
                </p>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${getRoleColor()} text-white shadow-lg`}>
                  {authUser?.role}
                </div>

                {/* Quick Info */}
                <div className="mt-6 space-y-3 text-left">
                  {authUser.phone && (
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                      <Phone className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Phone</p>
                        <p className="text-sm text-gray-900 font-semibold">{authUser.phone}</p>
                      </div>
                    </div>
                  )}
                  {authUser.department && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Department</p>
                        <p className="text-sm text-gray-900 font-semibold">{authUser.department}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Joined</p>
                      <p className="text-sm text-gray-900 font-semibold">
                        {new Date(authUser.createdAt!).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Card */}
            <Card className="bg-white rounded-2xl shadow-xl animate-fade-in-up animation-delay-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-lg">Statistics</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Events Registered</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">
                      {authUser.registeredEvents?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <UsersIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Clubs Joined</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {authUser.clubs?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Award className="h-5 w-5 text-orange-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Certificates</span>
                    </div>
                    <span className="text-2xl font-bold text-orange-600">
                      {authUser.certificates?.length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Edit Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white rounded-2xl shadow-xl animate-fade-in-up animation-delay-400">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-purple-600" />
                      <CardTitle>Personal Information</CardTitle>
                    </div>
                    <CardDescription>Update your personal details and bio</CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button 
                      variant="primary"
                      onClick={() => setIsEditing(true)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            firstName: authUser.firstName || '',
                            lastName: authUser.lastName || '',
                            phone: authUser.phone || '',
                            bio: authUser.bio || '',
                            department: authUser.department || '',
                            year: authUser.year?.toString() || '',
                          });
                        }}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      name="firstName"
                      label="First Name"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      className={!isEditing ? 'bg-gray-50' : ''}
                    />
                    <Input
                      name="lastName"
                      label="Last Name"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-gray-50' : ''}
                    />
                  </div>

                  <Input
                    name="phone"
                    label="Phone Number"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-gray-50' : ''}
                  />

                  {authUser.role === 'student' && (
                    <>
                      <Input
                        name="department"
                        label="Department"
                        value={formData.department}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />

                      <Input
                        name="year"
                        label="Year"
                        type="number"
                        value={formData.year}
                        onChange={handleChange}
                        disabled={!isEditing}
                        min="1"
                        max="6"
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bio
                    </label>
                    <div className="relative">
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                          !isEditing ? 'bg-gray-50 border-gray-200' : 'border-gray-200 hover:border-purple-300'
                        }`}
                        rows={4}
                        maxLength={300}
                        placeholder="Tell us about yourself..."
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white px-2 py-1 rounded-lg">
                        {formData.bio.length}/300
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSaving}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <Save className="h-5 w-5 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </form>

                {/* Additional Info Section */}
                {!isEditing && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-purple-600" />
                      Account Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-600 font-medium mb-1">Email Address</p>
                        <p className="text-sm text-gray-900 font-semibold flex items-center gap-2">
                          <Mail className="h-4 w-4 text-purple-600" />
                          {authUser.email}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-600 font-medium mb-1">Account Type</p>
                          <span className="text-2xl">{getRoleEmoji()}</span>
                        <p className={`text-sm font-bold bg-gradient-to-r ${getRoleColor()} bg-clip-text text-transparent flex items-center gap-2`}>
                          {authUser?.role}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
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
      `}</style>
    </div>
  );
}