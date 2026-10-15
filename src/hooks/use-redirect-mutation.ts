import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

/** A mutation whose success navigates away; `busy` stays true after success because the page has not unloaded yet. */
export function useRedirectMutation<TData, TVariables = void>(options: UseMutationOptions<TData, Error, TVariables>) {
  const mutation = useMutation(options);
  return { ...mutation, busy: mutation.isPending || mutation.isSuccess };
}
