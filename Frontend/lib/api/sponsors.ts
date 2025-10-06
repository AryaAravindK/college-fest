export async function getSponsors(slug: string) {
  const res = await fetch(`/api/events/${slug}/sponsors`);
  return res.json();
}