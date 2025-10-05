'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Users } from 'lucide-react';

export default function ClubsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
        <p className="mt-2 text-gray-600">Explore and join college clubs</p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Clubs Coming Soon</h3>
          <p className="text-gray-600">Club management features are under development</p>
        </CardContent>
      </Card>
    </div>
  );
}
