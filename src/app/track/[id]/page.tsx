import { redirect } from 'next/navigation';

interface TrackPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  redirect(`/post/${id}`);
}