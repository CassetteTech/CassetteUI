/** Routes whose hero paints its own backdrop under a transparent navbar. */
export function isHeroRoute(pathname: string | null | undefined) {
  return pathname === '/';
}
