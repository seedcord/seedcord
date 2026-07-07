/**
 * Checks if the provided value is an array of strings.
 *
 * @internal
 */
export function areRoutes(routes: unknown): routes is string[] {
    return Array.isArray(routes) && routes.every((r) => typeof r === 'string');
}
