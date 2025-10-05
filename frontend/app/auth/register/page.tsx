'use client';

import React, { useState,useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { UserPlus } from 'lucide-react';
import { UserRole } from '@/types';
import { get_clubs,create_club } from '@/lib/api/club';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'student' as UserRole,
    department: '',
    year: '',
    rollNumber: '',
    designation: '',
    club: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [clubs, setClubs] = useState<any[]>([]);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [newClub, setNewClub] = useState({ name: '', description: '' });

  useEffect(() => {
  const fetchClubs = async () => {
    try {
      const data = await get_clubs.getData();
      setClubs(data.clubs || []);
    } catch (err) {
      showToast('error', 'Failed to fetch clubs');
    }
  };
  fetchClubs();
}, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      showToast('error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const {
        confirmPassword,
        lastName,
        ...rawData
      } = formData;

      // Filter out fields not required for the selected role
      const roleFields: Record<string, string[]> = {
        student: ['department', 'year', 'rollNumber'],
        faculty: ['designation'],
        organizer: ['club'],
      };

      const allowedFields = ['firstName', 'email', 'password', 'phone', 'role', ...(roleFields[formData.role] || [])];

      const registerData: Record<string, string> = {};
      allowedFields.forEach(field => {
        if (rawData[field]) {
          registerData[field] = rawData[field];
        }
      });

      await register(registerData);
      showToast('success', 'Registration successful! Welcome to CollegeFest.');
      router.push('/dashboard'); // or login
    } catch (error: any) {
      showToast('error', error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Create Your Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join CollegeFest and start managing your events
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  name="firstName"
                  label="First Name"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
                <Input
                  type="text"
                  name="lastName"
                  label="Last Name"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>

              <Input
                type="email"
                name="email"
                label="Email Address"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <Input
                type="number"
                name="phone"
                label="Phone Number"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
                helperText="10 digit mobile number"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="student">Student</option>
                  <option value="organizer">Organizer</option>
                  <option value="faculty">Faculty</option>
                  <option value="public">Public</option>
                </select>
              </div>

              {/* Role-specific fields */}
              {formData.role === 'student' && (
                <>
                  <Input
                    type="text"
                    name="department"
                    label="Department"
                    placeholder="CSE"
                    value={formData.department}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    type="text"
                    name="year"
                    label="Year"
                    placeholder="2nd"
                    value={formData.year}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    type="text"
                    name="rollNumber"
                    label="Roll Number"
                    placeholder="123456"
                    value={formData.rollNumber}
                    onChange={handleChange}
                    required
                  />
                </>
              )}

              {formData.role === 'faculty' && (
                <Input
                  type="text"
                  name="designation"
                  label="Designation"
                  placeholder="Professor"
                  value={formData.designation}
                  onChange={handleChange}
                  required
                />
              )}

              {formData.role === 'organizer' && (
  <>
    {clubs.length > 0 && !showCreateClub ? (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Club <span className="text-red-500">*</span>
        </label>
        <select
          name="club"
          value={formData.club}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        >
          <option value="">-- Select a Club --</option>
          {clubs.map((club) => (
            <option key={club._id} value={club.name}>
              {club.name}
            </option>
          ))}
        </select>

        <p className="text-sm mt-2">
          Don’t see your club?{' '}
          <button
            type="button"
            onClick={() => setShowCreateClub(true)}
            className="text-primary-600 hover:underline"
          >
            Create a new one
          </button>
        </p>
      </div>
    ) : (
      <>
        <Input
          name="club"
          label="Club Name"
          placeholder="Enter new club name"
          value={newClub.name}
          onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
          required
        />
        <Input
          name="description"
          label="Club Description"
          placeholder="Enter a short description"
          value={newClub.description}
          onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
          required
        />

        <div className="flex justify-between items-center mt-2">
          <button
            type="button"
            onClick={async () => {
              if (!newClub.name || !newClub.description) {
                showToast('error', 'Name and description are required');
                return;
              }
              try {
                const response = await create_club.postData(newClub);
                const newClubName = newClub.name;
                setClubs([...clubs, { name: newClubName, _id: response.id }]);
                setFormData((prev) => ({ ...prev, club: newClubName }));
                setShowCreateClub(false);
                setNewClub({ name: '', description: '' });
                showToast('success', 'Club created successfully');
              } catch (err: any) {
                showToast('error', err.message || 'Failed to create club');
              }
            }}
            className="text-sm text-white bg-primary-600 px-3 py-1 rounded hover:bg-primary-700"
          >
            Submit Club
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateClub(false);
              setNewClub({ name: '', description: '' });
            }}
            className="text-sm text-gray-500 underline"
          >
            Cancel
          </button>
        </div>
      </>
    )}

    {/* No clubs fallback */}
    {clubs.length === 0 && !showCreateClub && (
      <p className="text-sm text-gray-600">
        No clubs available.{' '}
        <button
          type="button"
          onClick={() => setShowCreateClub(true)}
          className="text-primary-600 hover:underline"
        >
          Create a new one
        </button>
      </p>
    )}
  </>
)}


              <Input
                type="password"
                name="password"
                label="Password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                helperText="Minimum 6 characters"
                required
              />

              <Input
                type="password"
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    required
                  />
                </div>
                <div className="ml-2 text-sm">
                  <label htmlFor="terms" className="text-gray-600">
                    I agree to the{' '}
                    <Link href="/terms" className="font-medium text-primary-600 hover:text-primary-500">
                      Terms and Conditions
                    </Link>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
