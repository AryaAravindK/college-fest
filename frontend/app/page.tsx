import Link from 'next/link';
import { Calendar, Users, Trophy, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import "./globals.css";

export default function Home() {
  const features = [
    {
      icon: Calendar,
      title: 'Event Management',
      description: 'Create, manage, and participate in college events seamlessly',
    },
    {
      icon: Users,
      title: 'Club Activities',
      description: 'Join clubs and stay updated with their activities and announcements',
    },
    {
      icon: Trophy,
      title: 'Competitions & Results',
      description: 'Track competition results and earn certificates for your achievements',
    },
  ];

  return (
    <div className="flex flex-col">
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to CollegeFest
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Your all-in-one platform for managing college events, clubs, and student activities
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/events">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Browse Events
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-primary-600">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Why Choose CollegeFest?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="mb-4">
                      <Icon className="h-12 w-12 text-primary-600" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of students and organizers managing their events with CollegeFest
          </p>
          <Link href="/auth/register">
            <Button variant="primary" size="lg">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
