import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/db';
import EventPageClient from './EventPageClient';

// Checked on the server so an unknown slug is a real 404, not a 200 that only says "not found".
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await getEventBySlug(slug))) notFound();
  return <EventPageClient slug={slug} />;
}
