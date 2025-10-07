import { registrationsApi } from '@/lib/api/registrations';
import { Registration } from '@/types';

export const useRegistrations = (eventId: string) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        setIsLoading(true);
        const data = await registrationsApi.listRegistrationsForEvent(eventId);
        setRegistrations(data.docs);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch registrations');
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchRegistrations();
    }
  }, [eventId]);

  return { registrations, isLoading, error, setRegistrations };
};
