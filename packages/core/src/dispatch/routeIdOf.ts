// an empty route means seedcord didn't make the interaction's custom ID
/** @internal */
export function routeIdOf(kind: string, route: string): string {
    return `${kind}:${route || 'unrouted'}`;
}
