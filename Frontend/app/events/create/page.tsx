'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, MapPin, Users, DollarSign, Upload, X, Save,
  ArrowLeft, ArrowRight, CheckCircle, Image as ImageIcon,
  Clock, Globe, Award, FileText, Sparkles, AlertCircle
} from 'lucide-react';

export default function CreateEventPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    poster: '',
    category: 'technical',
    type: 'inter-college',
    mode: 'offline',
    
    // Dates
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    
    // Location
    venues: [''],
    meetingLink: '',
    
    // Registration
    capacity: 100,
    registrationType: 'individual',
    teamSizeMin: 1,
    teamSizeMax: 1,
    
    // Payment
    isPaid: false,
    fee: 0,
    paymentMode: 'online',
    
    // Advanced
    eligibilityCriteria: '',
    requiredDocuments: [],
    tags: []
  });

  const [errors, setErrors] = useState({});
  const [posterPreview, setPosterPreview] = useState('');

  const steps = [
    { num: 1, title: 'Basic Info', icon: FileText },
    { num: 2, title: 'Schedule', icon: Calendar },
    { num: 3, title: 'Registration', icon: Users },
    { num: 4, title: 'Payment', icon: DollarSign },
    { num: 5, title: 'Review', icon: CheckCircle }
  ];

  const categories = [
    { value: 'technical', label: 'Technical', emoji: '💻' },
    { value: 'cultural', label: 'Cultural', emoji: '🎭' },
    { value: 'sports', label: 'Sports', emoji: '⚽' },
    { value: 'literary', label: 'Literary', emoji: '📚' },
    { value: 'management', label: 'Management', emoji: '📊' },
    { value: 'workshop', label: 'Workshop', emoji: '🛠️' },
    { value: 'seminar', label: 'Seminar', emoji: '🎤' }
  ];

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleVenueChange = (index, value) => {
    const newVenues = [...formData.venues];
    newVenues[index] = value;
    setFormData({ ...formData, venues: newVenues });
  };

  const addVenue = () => {
    setFormData({ ...formData, venues: [...formData.venues, ''] });
  };

  const removeVenue = (index) => {
    const newVenues = formData.venues.filter((_, i) => i !== index);
    setFormData({ ...formData, venues: newVenues });
  };

  const validateStep = () => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.title.trim()) newErrors.title = 'Title is required';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
    }

    if (currentStep === 2) {
      if (!formData.startDate) newErrors.startDate = 'Start date is required';
      if (!formData.endDate) newErrors.endDate = 'End date is required';
      if (!formData.registrationDeadline) newErrors.registrationDeadline = 'Registration deadline is required';
      
      if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (currentStep === 3) {
      if (formData.venues.every(v => !v.trim()) && formData.mode !== 'online') {
        newErrors.venues = 'At least one venue is required';
      }
      if (!formData.capacity || formData.capacity < 1) {
        newErrors.capacity = 'Capacity must be at least 1';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(Math.min(currentStep + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    try {
      // API call to create event
      // const response = await eventsApi.createEvent(formData);
      
      alert('Event created successfully!');
      router.push('/events');
    } catch (error) {
      alert('Failed to create event: ' + error.message);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPosterPreview(reader.result);
        setFormData({ ...formData, poster: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 font-semibold mb-4 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl font-extrabold text-gray-900">Create New Event</h1>
          </div>
          <p className="text-lg text-gray-600">Fill in the details to create an amazing event</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              ></div>
            </div>

            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;

              return (
                <div key={step.num} className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => currentStep > step.num && setCurrentStep(step.num)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                        : isActive
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-110'
                        : 'bg-white text-gray-400 border-2 border-gray-200'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </button>
                  <span
                    className={`text-sm font-semibold ${
                      isActive ? 'text-purple-600' : 'text-gray-600'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Startup Pitch Fest 2024"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.title ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe your event in detail..."
                  rows={5}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.description ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Poster
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-all">
                  {posterPreview ? (
                    <div className="relative">
                      <img
                        src={posterPreview}
                        alt="Poster preview"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setPosterPreview('');
                          setFormData({ ...formData, poster: '' });
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Event Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="inter-college">🏫 Inter-College</option>
                    <option value="intra-college">🎓 Intra-College</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mode *
                  </label>
                  <select
                    value={formData.mode}
                    onChange={(e) => handleChange('mode', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="offline">📍 Offline</option>
                    <option value="online">💻 Online</option>
                    <option value="hybrid">🌐 Hybrid</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Schedule */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Schedule</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                      errors.startDate ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                      errors.endDate ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Registration Deadline *
                </label>
                <input
                  type="datetime-local"
                  value={formData.registrationDeadline}
                  onChange={(e) => handleChange('registrationDeadline', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.registrationDeadline ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.registrationDeadline && (
                  <p className="mt-1 text-sm text-red-600">{errors.registrationDeadline}</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Pro Tip</p>
                    <p className="text-sm text-blue-700">
                      Set the registration deadline at least 24 hours before the event starts to allow time for preparation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Registration */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Registration Details</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Venue(s) {formData.mode !== 'online' && '*'}
                </label>
                <div className="space-y-3">
                  {formData.venues.map((venue, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={venue}
                        onChange={(e) => handleVenueChange(index, e.target.value)}
                        placeholder={`Venue ${index + 1}`}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                      {formData.venues.length > 1 && (
                        <button
                          onClick={() => removeVenue(index)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addVenue}
                    className="text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center gap-1"
                  >
                    + Add Another Venue
                  </button>
                </div>
                {errors.venues && (
                  <p className="mt-1 text-sm text-red-600">{errors.venues}</p>
                )}
              </div>

              {(formData.mode === 'online' || formData.mode === 'hybrid') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Meeting Link {formData.mode === 'online' && '*'}
                  </label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => handleChange('meetingLink', e.target.value)}
                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Maximum Capacity *
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleChange('capacity', parseInt(e.target.value))}
                  min="1"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    errors.capacity ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.capacity && (
                  <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Registration Type *
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('registrationType', 'individual');
                      handleChange('teamSizeMin', 1);
                      handleChange('teamSizeMax', 1);
                    }}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.registrationType === 'individual'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <Users className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-bold text-gray-900">Individual</p>
                    <p className="text-sm text-gray-600">One participant per registration</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange('registrationType', 'team')}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.registrationType === 'team'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <Users className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-bold text-gray-900">Team</p>
                    <p className="text-sm text-gray-600">Multiple participants per team</p>
                  </button>
                </div>
              </div>

              {formData.registrationType === 'team' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Min Team Size
                    </label>
                    <input
                      type="number"
                      value={formData.teamSizeMin}
                      onChange={(e) => handleChange('teamSizeMin', parseInt(e.target.value))}
                      min="1"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Max Team Size
                    </label>
                    <input
                      type="number"
                      value={formData.teamSizeMax}
                      onChange={(e) => handleChange('teamSizeMax', parseInt(e.target.value))}
                      min={formData.teamSizeMin}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Eligibility Criteria (Optional)
                </label>
                <textarea
                  value={formData.eligibilityCriteria}
                  onChange={(e) => handleChange('eligibilityCriteria', e.target.value)}
                  placeholder="e.g., Open to all undergraduate students"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Settings</h2>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPaid}
                    onChange={(e) => {
                      handleChange('isPaid', e.target.checked);
                      if (!e.target.checked) handleChange('fee', 0);
                    }}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">This is a paid event</p>
                    <p className="text-sm text-gray-600">Participants need to pay to register</p>
                  </div>
                </label>
              </div>

              {formData.isPaid && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Registration Fee (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.fee}
                      onChange={(e) => handleChange('fee', parseInt(e.target.value))}
                      min="0"
                      placeholder="500"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Payment Mode *
                    </label>
                    <div className="grid md:grid-cols-3 gap-4">
                      {['online', 'offline', 'both'].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleChange('paymentMode', mode)}
                          className={`p-4 border-2 rounded-xl text-center transition-all ${
                            formData.paymentMode === mode
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <p className="font-bold text-gray-900 capitalize">{mode}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-900">Important</p>
                        <p className="text-sm text-yellow-700">
                          Make sure you have configured your payment gateway before accepting online payments.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Event</h2>

              <div className="space-y-4">
                {/* Basic Info Preview */}
                <div className="border-2 border-gray-100 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Basic Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Title</p>
                      <p className="font-semibold text-gray-900">{formData.title}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Category</p>
                      <p className="font-semibold text-gray-900 capitalize">{formData.category}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{formData.type}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Mode</p>
                      <p className="font-semibold text-gray-900 capitalize">{formData.mode}</p>
                    </div>
                  </div>
                  {posterPreview && (
                    <div className="mt-4">
                      <p className="text-gray-600 text-sm mb-2">Poster</p>
                      <img src={posterPreview} alt="Event poster" className="h-32 rounded-lg" />
                    </div>
                  )}
                </div>

                {/* Schedule Preview */}
                <div className="border-2 border-gray-100 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Schedule
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Start Date</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(formData.startDate).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">End Date</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(formData.endDate).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Registration Deadline</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(formData.registrationDeadline).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Registration Preview */}
                <div className="border-2 border-gray-100 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Registration
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Capacity</p>
                      <p className="font-semibold text-gray-900">{formData.capacity} participants</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{formData.registrationType}</p>
                    </div>
                    {formData.registrationType === 'team' && (
                      <div>
                        <p className="text-gray-600">Team Size</p>
                        <p className="font-semibold text-gray-900">
                          {formData.teamSizeMin} - {formData.teamSizeMax} members
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-600 text-sm mb-2">Venues</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.venues.filter(v => v.trim()).map((venue, idx) => (
                        <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                          {venue}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Payment Preview */}
                <div className="border-2 border-gray-100 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    Payment
                  </h3>
                  {formData.isPaid ? (
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Registration Fee</p>
                        <p className="font-semibold text-gray-900 text-2xl">₹{formData.fee}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Payment Mode</p>
                        <p className="font-semibold text-gray-900 capitalize">{formData.paymentMode}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">This is a free event</p>
                  )}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">Ready to Publish?</p>
                    <p className="text-sm text-green-700">
                      Review all details carefully. You can edit the event after publishing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-500 hover:text-purple-600'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Next
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Save className="h-5 w-5" />
              Create Event
            </button>
          )}
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
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}