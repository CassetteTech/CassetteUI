import { redirect } from 'next/navigation';

type InternalOperationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/* Operations was consolidated into Sentinel's Runtime view (CAS-321). Keep old
   deep links working, including `?job=<id>`. */
export default async function InternalOperationsPage({ searchParams }: InternalOperationsPageProps) {
  const params = (await searchParams) ?? {};
  const job = typeof params.job === 'string' ? params.job : undefined;
  redirect(
    job
      ? `/internal/sentinel?view=runtime&job=${encodeURIComponent(job)}`
      : '/internal/sentinel?view=runtime'
  );
}
