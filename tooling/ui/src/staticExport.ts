import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';

import type { SiteAddress } from './sites';
import type { NextConfig } from 'next';

const PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js'];
// a build-time notFound() still writes the route's file into a static export
const DEV_ONLY_EXTENSIONS = ['dev.tsx', 'dev.ts'];

// next dev writes into <distDir>/dev when one is set
export function staticExport(
    phase: string,
    site: SiteAddress
): Pick<NextConfig, 'pageExtensions' | 'basePath' | 'output' | 'distDir' | 'images'> {
    const dev = phase === PHASE_DEVELOPMENT_SERVER;
    return {
        pageExtensions: dev ? [...PAGE_EXTENSIONS, ...DEV_ONLY_EXTENSIONS] : PAGE_EXTENSIONS,
        basePath: site.path,
        output: 'export',
        ...(phase === PHASE_PRODUCTION_BUILD && { distDir: `dist${site.path}` }),
        images: { unoptimized: true }
    };
}
