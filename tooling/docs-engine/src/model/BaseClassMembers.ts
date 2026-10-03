import { ApiClass, ApiStaticMixin, type ApiItem } from '@microsoft/api-extractor-model';

import { accessorRole } from '#model/adapter-helpers';
import { apiKindToDocKind, DocKind } from '#model/kinds';

// a static never overrides an instance member
function memberKey(member: ApiItem): string {
    const isStatic = ApiStaticMixin.isBaseClassOf(member) && member.isStatic;
    return `${isStatic ? 'static ' : ''}${member.displayName}`;
}

// tsc strips `override` from the .d.ts
export class BaseClassMembers {
    private readonly keys: ReadonlySet<string>;

    public constructor(container: ApiItem | undefined) {
        this.keys = BaseClassMembers.keysOf(container);
    }

    public isOverriddenBy(member: ApiItem): boolean {
        // the .d.ts drops `declare` from a field
        const callable = apiKindToDocKind(member) === DocKind.Method || accessorRole(member) !== null;
        return callable && this.keys.has(memberKey(member));
    }

    private static keysOf(container: ApiItem | undefined): ReadonlySet<string> {
        if (!(container instanceof ApiClass) || !container.extendsType) return new Set();
        const baseRef = container.extendsType.excerpt.spannedTokens.find(
            (token) => token.canonicalReference
        )?.canonicalReference;
        if (!baseRef) return new Set();
        const base = container.getAssociatedModel()?.resolveDeclarationReference(baseRef, container).resolvedApiItem;
        if (!(base instanceof ApiClass)) return new Set();
        return new Set(base.findMembersWithInheritance().items.map(memberKey));
    }
}
