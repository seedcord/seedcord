import { isBuilderComponentClass } from '#components/Component';
import { CommandMetadataKey } from '#src/metadataKeys';

import type { BuilderComponent } from '#components/Component';
import type { Constructor } from 'type-fest';

/** @internal */
export type CommandCtor = Constructor<BuilderComponent<'command' | 'context_menu'>, never[]>;

// the cli's codegen scan reads this too
/** @internal */
export function isCommandClass(value: unknown): value is CommandCtor {
    return isBuilderComponentClass(value) && Reflect.hasMetadata(CommandMetadataKey, value);
}
