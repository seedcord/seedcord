import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';
import { describe, expect, it } from 'vitest';

import { GUIDE } from '#src/sites';
import { staticExport } from '#src/staticExport';

describe('staticExport', () => {
    it('writes a production build into dist under the site path', () => {
        expect(staticExport(PHASE_PRODUCTION_BUILD, GUIDE)).toMatchObject({
            basePath: '/guide',
            output: 'export',
            distDir: 'dist/guide'
        });
    });

    it('keeps the dev server out of the folder a deploy uploads', () => {
        expect(staticExport(PHASE_DEVELOPMENT_SERVER, GUIDE)).not.toHaveProperty('distDir');
    });

    it('serves dev-only pages in dev and leaves them out of the export', () => {
        expect(staticExport(PHASE_DEVELOPMENT_SERVER, GUIDE).pageExtensions).toContain('dev.tsx');
        expect(staticExport(PHASE_PRODUCTION_BUILD, GUIDE).pageExtensions).not.toContain('dev.tsx');
    });
});
