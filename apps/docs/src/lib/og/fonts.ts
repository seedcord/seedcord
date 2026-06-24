import { loadOgFonts } from '@seedcord/ui/og';

// decode the base64 fonts once at module load and reuse the array across every ImageResponse, the
// decode is the dominant Satori cost so calling loadOgFonts per request would halve throughput.
export const OG_FONTS = loadOgFonts();
