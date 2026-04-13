import { redirect } from 'next/navigation';

type SignupAliasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupAliasPage({ searchParams }: SignupAliasPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }

    if (typeof value === 'string') {
      params.set(key, value);
    }
  }

  const search = params.toString();
  redirect(search ? `/auth/signup?${search}` : '/auth/signup');
}
 