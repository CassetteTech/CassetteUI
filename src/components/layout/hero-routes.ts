/** Routes whose hero paints its own backdrop under a transparent navbar:
    the home page, the home page concepts at /1 … /11, and the background
    gallery that previews their backdrops. */
export function isHeroRoute(pathname: string | null | undefined) {
  return pathname === '/' || pathname === '/backgrounds' || /^\/(1[01]|[1-9])$/.test(pathname ?? '');
}
