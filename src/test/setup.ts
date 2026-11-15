import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  // Routes live in the URL and localStorage, which outlive a test.
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});
