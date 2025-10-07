import { useState, useEffect } from 'react';
import { eventsApi } from '@/lib/api/events';
import { Event } from '@/types';

export const useEvent = (slug: string) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const data = await eventsApi.getEventBySlug(slug);
        setEvent(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch event');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchEvent();
    }
  }, [slug]);

  return { event, isLoading, error, setEvent };
};