import { useState, useEffect } from 'react';

export const SEARCH_DEBOUNCE_MS = 300;

export function useDebounce<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}