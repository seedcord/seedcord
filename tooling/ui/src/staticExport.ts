import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';

import type { SiteAddress } from './sites';

const PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js'];
// a build-time notFound() still writes the route's file into a static export
const DEV_ONLY_EXTENSIONS = ['dev.tsx', 'dev.ts'];

export interface StaticExportConfig {
    pageExtensions: string[];
    basePath: string;
    output: 'export';
    distDir?: string;
    images: { unoptimized: true };
}

// next dev writes into <distDir>/dev when one is set
export function staticExport(phase: string, site: SiteAddress): StaticExportConfig {
    const dev = phase === PHASE_DEVELOPMENT_SERVER;
    return {
        pageExtensions: dev ? [...PAGE_EXTENSIONS, ...DEV_ONLY_EXTENSIONS] : PAGE_EXTENSIONS,
        basePath: site.path,
        output: 'export',
        ...(phase === PHASE_PRODUCTION_BUILD && { distDir: `dist${site.path}` }),
        images: { unoptimized: true }
    };
}
