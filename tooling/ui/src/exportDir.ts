import type { SiteAddress } from '@seedcord/brand';

export const exportDir = (site: SiteAddress): string => `dist${site.path}`;
