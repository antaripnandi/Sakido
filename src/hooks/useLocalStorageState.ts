import React, { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for React state synchronized with localStorage.
 * Includes safe JSON parsing/serialization and optional debounced storage updates.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
  debounceMs: number = 0
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`Error reading localStorage key "${key}":`, e);
    }
    return typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (debounceMs <= 0) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.warn(`Error writing localStorage key "${key}":`, e);
      }
      return;
    }

    const handler = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(stateRef.current));
      } catch (e) {
        console.warn(`Error writing localStorage key "${key}":`, e);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [key, state, debounceMs]);

  return [state, setState];
}
