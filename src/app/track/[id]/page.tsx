import { redirect } from 'next/navigation';

interface TrackPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  // Redirect to the post page with the ID
  redirect(`/post?id=${id}`);
}