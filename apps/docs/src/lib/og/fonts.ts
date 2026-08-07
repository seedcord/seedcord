import { loadOgFonts } from '@seedcord/ui/og';

// the base64 decode is the dominant Satori cost, so calling this per request would halve throughput
export const OG_FONTS = loadOgFonts();
