import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// testing-library's auto cleanup only covers the first file in a worker
afterEach(cleanup);
