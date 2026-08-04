import { referenceFromCanonical } from '@model/canonical-ref';
import { codeDestinationName } from '@model/tsdoc-comment';

import type { ApiItem, ApiModel } from '@microsoft/api-extractor-model';
import type { LinkResolver } from '@model/tsdoc-comment';
import type { DocReference } from '@src/types';

/**
 * Builds the `{@link}` resolver for one package, bound to its API model and re-export table.
 *
 * A bare `{@link Name}` resolves against `fromItem`'s declaring package, so without that context AE
 * resolves only globally-unique absolute references. A re-exported symbol has no ApiItem in this
 * package's model (no bundledPackages), so resolveDeclarationReference can't reach it. The name is then
 * mapped through the re-export table to its declaring package, the same owner the type-excerpt path
 * cross-package links through.
 */
export function createLinkResolver(
    model: ApiModel,
    reexportOwners: ReadonlyMap<string, string>
): (fromItem: ApiItem) => LinkResolver {
    return (fromItem) => (codeDestination, fallbackText) => {
        // justified: codeDestination is unknown, cast to AE's DeclarationReference (AE returns an error result, never throws, when unresolved).
        const resolved = model.resolveDeclarationReference(
            codeDestination as Parameters<ApiModel['resolveDeclarationReference']>[0],
            fromItem
        );
        const target = resolved.resolvedApiItem;
        if (target?.canonicalReference) return referenceFromCanonical(target.canonicalReference, fallbackText);

        const owner = reexportOwners.get(codeDestinationName(codeDestination));
        if (!owner) return undefined;
        return {
            name: fallbackText,
            qualifiedName: codeDestinationName(codeDestination),
            packageName: owner
        } satisfies DocReference;
    };
}
