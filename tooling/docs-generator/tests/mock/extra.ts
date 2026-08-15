/**
 * A second public entry point, reached as `@seedcord/mock-docs/extra`.
 *
 * @packageDocumentation
 */

// the root entry exports both of these too, the way @seedcord/http/edge re-exports the http root.
// mockFunction is overloaded.
export { mockVariable } from './variable';
// eslint-disable-next-line @typescript-eslint/no-deprecated -- deprecated on purpose, the fixture tests deprecation rendering
export { mockFunction } from './function';

// never exported, the way @seedcord/core/hmr references HmrModuleHandlerOptions without exporting it.
// includeForgottenExports still puts it in the model.
interface ExtraOnly {
    tag: 'extra';
}

/** Returns the tag the extra subpath is known by. */
export function extraFunction(): ExtraOnly {
    return { tag: 'extra' };
}
