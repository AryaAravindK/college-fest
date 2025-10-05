'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { UserPlus, User, Mail, Phone, Lock, Briefcase, GraduationCap, Hash, Building, Calendar as CalendarIcon, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { UserRole } from '@/types';
import { get_clubs, create_club } from '@/lib/api/club';

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
  const [currentStep, setCurrentStep] = useState(1);
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

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.firstName || !formData.email || !formData.phone) {
        showToast('error', 'Please fill all required fields');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
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
      const { confirmPassword, lastName, ...rawData } = formData;

      const roleFields: Record<string, string[]> = {
        student: ['department', 'year', 'rollNumber'],
        faculty: ['designation'],
        organizer: ['club'],
      };

      const allowedFields = ['firstName', 'email', 'password', 'phone', 'role', ...(roleFields[formData.role] || [])];

      const registerData: Record<string, string> = {};
      allowedFields.forEach(field => {
        if (rawData[field as keyof typeof rawData]) {
          registerData[field] = rawData[field as keyof typeof rawData] as string;
        }
      });

      await register(registerData);
      showToast('success', 'Registration successful! Welcome to CollegeFest.');
      router.push('/dashboard');
    } catch (error: any) {
      showToast('error', error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info', icon: User },
    { number: 2, title: 'Role Details', icon: Briefcase },
    { number: 3, title: 'Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-xl mb-6 transform hover:rotate-6 transition-transform duration-300">
            <UserPlus className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
            Join CollegeFest! 🎉
          </h2>
          <p className="text-lg text-gray-600">
            Create your account and start exploring events
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 animate-fade-in-up animation-delay-200">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                      isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                      isCurrent ? 'bg-gradient-to-r from-purple-600 to-pink-600 scale-110' :
                      'bg-gray-200'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-white" />
                      ) : (
                        <Icon className={`h-6 w-6 ${isCurrent ? 'text-white' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${isCurrent ? 'text-purple-600' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-200'
                    }`}></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 animate-fade-in-up animation-delay-400">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
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
                  type="tel"
                  name="phone"
                  label="Phone Number"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  helperText="10 digit mobile number"
                  required
                />

                <Button 
                  type="button" 
                  onClick={handleNextStep}
                  variant="primary"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Step 2: Role Details */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Your Role <span className="text-pink-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'student', label: 'Student', icon: '🎓' },
                      { value: 'organizer', label: 'Organizer', icon: '📋' },
                      { value: 'faculty', label: 'Faculty', icon: '👨‍🏫' },
                      { value: 'public', label: 'Public', icon: '👤' }
                    ].map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: role.value as UserRole })}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          formData.role === role.value
                            ? 'border-purple-600 bg-purple-50 shadow-lg scale-105'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-3xl mb-2">{role.icon}</div>
                        <div className="font-semibold text-gray-900">{role.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role-specific fields */}
                {formData.role === 'student' && (
                  <div className="space-y-4 animate-fade-in">
                    <Input
                      type="text"
                      name="department"
                      label="Department"
                      placeholder="Computer Science"
                      value={formData.department}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      type="text"
                      name="year"
                      label="Year"
                      placeholder="2nd Year"
                      value={formData.year}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      type="text"
                      name="rollNumber"
                      label="Roll Number"
                      placeholder="CS2024001"
                      value={formData.rollNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}

                {formData.role === 'faculty' && (
                  <Input
                    type="text"
                    name="designation"
                    label="Designation"
                    placeholder="Assistant Professor"
                    value={formData.designation}
                    onChange={handleChange}
                    required
                  />
                )}

                {formData.role === 'organizer' && (
                  <div className="space-y-4">
                    {clubs.length > 0 && !showCreateClub ? (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Select Club <span className="text-pink-500">*</span>
                        </label>
                        <select
                          name="club"
                          value={formData.club}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          required
                        >
                          <option value="">-- Select a Club --</option>
                          {clubs.map((club) => (
                            <option key={club._id} value={club.name}>
                              {club.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCreateClub(true)}
                          className="mt-2 text-sm text-purple-600 hover:text-pink-600 font-semibold"
                        >
                          + Create a new club
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fade-in">
                        <Input
                          name="club"
                          label="Club Name"
                          placeholder="Enter new club name"
                          value={newClub.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClub({ ...newClub, name: e.target.value })}
                          required
                        />
                        <Input
                          name="description"
                          label="Club Description"
                          placeholder="Brief description of the club"
                          value={newClub.description}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClub({ ...newClub, description: e.target.value })}
                          required
                        />
                        <div className="flex gap-3">
                          <Button
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
                            variant="primary"
                          >
                            Create Club
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setShowCreateClub(false);
                              setNewClub({ name: '', description: '' });
                            }}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    onClick={handlePrevStep}
                    variant="outline"
                    className="w-full"
                  >
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleNextStep}
                    variant="primary"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Security */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
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

                <div className="flex items-start p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-0.5"
                    required
                  />
                  <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
                    I agree to the{' '}
                    <Link href="/terms" className="font-semibold text-purple-600 hover:text-pink-600">
                      Terms and Conditions
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="font-semibold text-purple-600 hover:text-pink-600">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    onClick={handlePrevStep}
                    variant="outline"
                    className="w-full"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    isLoading={isLoading}
                  >
                    <Sparkles className="h-5 w-5" />
                    Create Account
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Login Link */}
        <div className="text-center animate-fade-in-up animation-delay-600">
          <p className="text-base text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/auth/login" 
              className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }

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

        .animate-blob {
          animation: blob 7s infinite;
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

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}