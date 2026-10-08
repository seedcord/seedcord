/**
 * A base class from another package, the way `PluginHost` comes from `@seedcord/core`.
 *
 * @packageDocumentation
 */

/** Extended by the mock's `workerd` build. */
export class MockRemoteBase {
    /** Returns the value it receives. */
    public attach(value: string): string {
        return value;
    }
}
