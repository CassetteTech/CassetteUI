import { useEffect } from 'react';

/** The browser scrolls to a `#hash` target only at load; a target that renders later scrolls itself into view here. */
export function useScrollToHashTarget(id: string) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const target = document.getElementById(id);
    if (target && target.getBoundingClientRect().top >= window.innerHeight) target.scrollIntoView({ block: 'start' });
  }, [id]);
}
