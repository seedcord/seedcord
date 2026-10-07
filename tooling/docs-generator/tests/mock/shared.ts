/**
 * A subpath whose slug matches the shared model's filename, as `@seedcord/mock-docs/shared`.
 *
 * @packageDocumentation
 */

import { MockHostBase } from './hostBase.js';

// ServerHost in @seedcord/core/node extends PluginHost from /plugin the same way
/** A host whose base class comes from the extra subpath. */
export class SharedHost extends MockHostBase {}

/** Returns the tag the shared subpath is known by. */
export function sharedOnlyFunction(): string {
    return 'shared';
}
