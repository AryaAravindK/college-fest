export async function getResults(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/results`);
  if (!res.ok) throw new Error('Failed to fetch results');
  return res.json();
}

export async function addResult(slug: string, result: any) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to add result');
  return res.json();
}

export async function deleteResult(slug: string, resultId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/results/${resultId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete result');
}
