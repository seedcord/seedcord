import { isBuilderComponentClass } from '#components/Component';
import { CommandMetadataKey } from '#src/metadataKeys';

import type { BuilderComponent } from '#components/Component';

/** @internal */
export type CommandCtor = new () => BuilderComponent<'command' | 'context_menu'>;

// the cli's codegen scan reads this too
/** @internal */
export function isCommandClass(value: unknown): value is CommandCtor {
    return isBuilderComponentClass(value) && Reflect.hasMetadata(CommandMetadataKey, value);
}
