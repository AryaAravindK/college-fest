'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Users, Trophy, ArrowRight, Sparkles, Zap, Star, TrendingUp } from 'lucide-react';

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5',
    secondary: 'bg-white text-purple-600 hover:bg-gray-50 border-2 border-purple-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5',
    outline: 'border-2 border-white text-white hover:bg-white hover:text-purple-600 transform hover:-translate-y-0.5'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-full font-semibold transition-all duration-300 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', ...props }) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default function Home() {
  const features = [
    {
      icon: Calendar,
      title: 'Event Management',
      description: 'Create, manage, and participate in college events seamlessly with real-time updates',
      color: 'from-blue-500 to-cyan-500',
      delay: '0'
    },
    {
      icon: Users,
      title: 'Club Activities',
      description: 'Join clubs and stay updated with their activities, announcements, and exclusive content',
      color: 'from-purple-500 to-pink-500',
      delay: '100'
    },
    {
      icon: Trophy,
      title: 'Competitions & Results',
      description: 'Track competition results, earn certificates, and showcase your achievements',
      color: 'from-orange-500 to-red-500',
      delay: '200'
    },
  ];

  const stats = [
    { icon: Users, value: '5000+', label: 'Active Students', color: 'text-blue-600' },
    { icon: Calendar, value: '200+', label: 'Events Hosted', color: 'text-purple-600' },
    { icon: Trophy, value: '150+', label: 'Competitions', color: 'text-orange-600' },
    { icon: Star, value: '50+', label: 'Active Clubs', color: 'text-pink-600' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero Section with Animated Background */}
      <section className="relative overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 text-white py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full mb-6 animate-fade-in">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span className="text-sm font-medium">Welcome to the Future of Campus Events</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold mb-6 animate-fade-in-up">
                Experience Campus Life
                <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent mt-2">
                  Like Never Before
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl mb-10 text-purple-100 animate-fade-in-up animation-delay-200 leading-relaxed">
                Your all-in-one platform for discovering events, joining clubs, and making unforgettable memories
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
                <Button variant="secondary" size="lg" className="group">
                  Browse Events
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="lg" className="group">
                  <Zap className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                  Get Started Free
                </Button>
              </div>

              {/* Floating Icons Animation */}
              <div className="mt-16 flex justify-center gap-8 animate-fade-in animation-delay-600">
                <div className="animate-float">
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
                    <Calendar className="h-8 w-8 text-yellow-300" />
                  </div>
                </div>
                <div className="animate-float animation-delay-1000">
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
                    <Users className="h-8 w-8 text-pink-300" />
                  </div>
                </div>
                <div className="animate-float animation-delay-2000">
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
                    <Trophy className="h-8 w-8 text-blue-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="relative -mt-1">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${stat.color} bg-opacity-10 rounded-2xl mb-3`}>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                  <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-4">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-600">FEATURES</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need in
              <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                One Place
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful tools designed to make your campus experience amazing
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="group cursor-pointer animate-fade-in-up overflow-hidden"
                  style={{ animationDelay: `${parseInt(feature.delay)}ms` }}
                >
                  <div className="p-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    <div className="flex items-center text-purple-600 font-semibold group-hover:gap-2 transition-all">
                      Learn more
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  {/* Gradient Border Effect */}
                  <div className={`h-1 bg-gradient-to-r ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse animation-delay-1000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full mb-6">
              <TrendingUp className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-medium text-white">JOIN THOUSANDS OF STUDENTS</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your
              <span className="block mt-2">Campus Experience?</span>
            </h2>
            
            <p className="text-xl text-purple-100 mb-10 leading-relaxed">
              Join thousands of students and organizers making their events unforgettable with CollegeFest
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg" className="group">
                <Sparkles className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                Create Free Account
              </Button>
              <Button variant="outline" size="lg" className="group">
                Watch Demo
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <p className="mt-6 text-purple-200 text-sm">
              ✨ No credit card required • 🚀 Get started in 2 minutes
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
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

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
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

        .animation-delay-1000 {
          animation-delay: 1s;
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