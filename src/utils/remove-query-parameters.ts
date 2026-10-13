const pathWithout = (keys: string[]) => {
  const url = new URL(window.location.href);
  for (const key of keys) url.searchParams.delete(key);
  return `${url.pathname}${url.search}${url.hash}`;
};

/** Removes completed handoff parameters without adding a history entry. */
export function removeQueryParameters(...keys: string[]) {
  window.history.replaceState(window.history.state, '', pathWithout(keys));
}

/** Removes parameters from the address bar and from the router's search params, so a later
    navigation built from those params cannot bring them back. Next.js updates its router only
    for a replaceState call without its own history state. */
export function removeQueryParametersFromRouter(...keys: string[]) {
  window.history.replaceState(null, '', pathWithout(keys));
}
