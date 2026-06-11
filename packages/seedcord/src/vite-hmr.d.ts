import type { SeedcordFrameworkEvents, SeedcordCliEvents } from '@seedcord/types/internal';

declare module 'vite/types/customEvent.d.ts' {
    interface CustomEventMap extends SeedcordFrameworkEvents, SeedcordCliEvents {}
}
