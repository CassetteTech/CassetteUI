import { redirect } from 'next/navigation';

interface ArtistPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;
  redirect(`/post/${id}`);
}