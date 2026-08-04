import {
    ApiAbstractMixin,
    ApiOptionalMixin,
    ApiProtectedMixin,
    ApiReadonlyMixin,
    ApiReleaseTagMixin,
    ApiStaticMixin,
    ReleaseTag,
    type ApiItem
} from '@microsoft/api-extractor-model';

import type { DocFlags } from '@src/types';

/**
 * Bits the adapter derives (API Extractor doesn't model them directly) and folds into the flags.
 * `access` 'private' is detected from the excerpt; private members are filtered out upstream, so it
 * only appears transiently.
 */
export interface DerivedFlagBits {
    access?: DocFlags['access'];
    accessor?: DocFlags['accessor'];
    isConst?: boolean;
    isReadonly?: boolean;
    isAsync?: boolean;
    isDeprecated?: boolean;
    isInherited?: boolean;
    isDecorator?: boolean;
    isOverwriting?: boolean;
}

interface MixinBooleans {
    isStatic: boolean;
    isAbstract: boolean;
    isReadonly: boolean;
    isOptional: boolean;
    isProtected: boolean;
    isInternal: boolean;
}

function readMixins(item: ApiItem): MixinBooleans {
    return {
        isStatic: ApiStaticMixin.isBaseClassOf(item) && item.isStatic,
        isAbstract: ApiAbstractMixin.isBaseClassOf(item) && item.isAbstract,
        isReadonly: ApiReadonlyMixin.isBaseClassOf(item) && item.isReadonly,
        isOptional: ApiOptionalMixin.isBaseClassOf(item) && item.isOptional,
        isProtected: ApiProtectedMixin.isBaseClassOf(item) && item.isProtected,
        isInternal: ApiReleaseTagMixin.isBaseClassOf(item) && item.releaseTag === ReleaseTag.Internal
    };
}

export function buildFlags(item: ApiItem, derived: DerivedFlagBits = {}): DocFlags {
    const mixins = readMixins(item);
    return {
        // `public` is the default and is not rendered (matches TypeDoc, which only surfaces
        // protected/private). `??` would keep an explicit derived value (e.g. accessor access).
        access: derived.access ?? (mixins.isProtected ? 'protected' : null),
        accessor: derived.accessor ?? null,
        isStatic: mixins.isStatic,
        isAbstract: mixins.isAbstract,
        isConst: derived.isConst ?? false,
        isReadonly: derived.isReadonly ?? mixins.isReadonly,
        isOptional: mixins.isOptional,
        isAsync: derived.isAsync ?? false,
        isDeprecated: derived.isDeprecated ?? false,
        isInherited: derived.isInherited ?? false,
        isDecorator: derived.isDecorator ?? false,
        isInternal: mixins.isInternal,
        isExternal: false,
        isOverwriting: derived.isOverwriting ?? false
    };
}
