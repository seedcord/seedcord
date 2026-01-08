import type { SeedcordFrameworkEvents, SeedcordCliEvents } from '@seedcord/cli/vite-hmr';

declare module 'vite/types/customEvent.d.ts' {
    interface CustomEventMap extends SeedcordFrameworkEvents, SeedcordCliEvents {}
}
