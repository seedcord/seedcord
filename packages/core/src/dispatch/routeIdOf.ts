import type { DispatchContext } from './DispatchContext';

// an empty route means seedcord didn't make the interaction's custom ID
export function routeIdOf(kind: DispatchContext['kind'], route: string): string {
    return `${kind}:${route || 'unrouted'}`;
}
