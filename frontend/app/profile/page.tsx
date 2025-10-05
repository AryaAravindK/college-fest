'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { usersApi } from '@/lib/api/users';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { User, Mail, Phone, Calendar, Award } from 'lucide-react';

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
    if (!authLoading && !authUser) {
      router.push('/auth/login');
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
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-600">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                  {authUser.profilePic ? (
                    <img
                      src={authUser.profilePic}
                      alt={authUser.firstName}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-primary-600" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {authUser.firstName} {authUser.lastName}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{authUser.email}</p>
                <div className="mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                    {authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1)}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>{authUser.email}</span>
                </div>
                {authUser.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{authUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Joined {new Date(authUser.createdAt!).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Registered Events</span>
                  <span className="font-semibold text-gray-900">
                    {authUser.registeredEvents?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Clubs Joined</span>
                  <span className="font-semibold text-gray-900">
                    {authUser.clubs?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Certificates</span>
                  <span className="font-semibold text-gray-900">
                    {authUser.certificates?.length || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    name="firstName"
                    label="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    required
                  />
                  <Input
                    name="lastName"
                    label="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <Input
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                />

                <Input
                  name="department"
                  label="Department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={!isEditing}
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
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                    rows={4}
                    maxLength={300}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.bio.length}/300 characters
                  </p>
                </div>

                {isEditing && (
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isSaving}
                    >
                      Save Changes
                    </Button>
                    <Button
                      type="button"
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
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
