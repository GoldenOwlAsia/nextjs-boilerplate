import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';

// `globals: false` keeps vitest out of the global type space, so RTL's automatic
// cleanup doesn't run — do it explicitly.
afterEach(() => {
  cleanup();
});
