import path from 'node:path';

import { DocsEngine } from '@seedcord/docs-engine';
import { cache } from 'react';

const GENERATED_ROOT = path.resolve(process.cwd(), '../../generated');

export const getDocsEngine = cache(async () => DocsEngine.create({ generatedRoot: GENERATED_ROOT }));

export type { DocsEngine };
