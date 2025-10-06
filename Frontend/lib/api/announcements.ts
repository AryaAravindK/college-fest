export async function getAnnouncements(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/announcements`);
  if (!res.ok) throw new Error('Failed to fetch announcements');
  return res.json();
}

export async function addAnnouncement(slug: string, announcement: any) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(announcement),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to add announcement');
  return res.json();
}

export async function deleteAnnouncement(slug: string, announcementId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/announcements/${announcementId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete announcement');
}
