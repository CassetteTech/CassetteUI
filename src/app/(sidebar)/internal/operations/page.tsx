import { redirect } from 'next/navigation';

type InternalOperationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InternalOperationsPage({ searchParams }: InternalOperationsPageProps) {
  const params = (await searchParams) ?? {};
  const job = typeof params.job === 'string' ? params.job : undefined;
  redirect(
    job
      ? `/internal/sentinel?view=runtime&job=${encodeURIComponent(job)}`
      : '/internal/sentinel?view=runtime'
  );
}
