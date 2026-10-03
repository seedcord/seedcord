import { ApiAbstractMixin, ApiClass, ApiStaticMixin, type ApiItem } from '@microsoft/api-extractor-model';

import { accessorRole } from '#model/adapter-helpers';
import { apiKindToDocKind, DocKind } from '#model/kinds';

// a static never overrides an instance member
function memberKey(member: ApiItem): string {
    const isStatic = ApiStaticMixin.isBaseClassOf(member) && member.isStatic;
    return `${isStatic ? 'static ' : ''}${member.displayName}`;
}

const isAbstract = (member: ApiItem): boolean => ApiAbstractMixin.isBaseClassOf(member) && member.isAbstract;

// tsc strips `override` from the .d.ts. seedcord leaves it off members that implement an abstract one
export function overridableBaseKeys(container: ApiItem | undefined): ReadonlySet<string> {
    if (!(container instanceof ApiClass) || !container.extendsType) return new Set();
    const baseRef = container.extendsType.excerpt.spannedTokens.find(
        (token) => token.canonicalReference
    )?.canonicalReference;
    if (!baseRef) return new Set();
    const base = container.getAssociatedModel()?.resolveDeclarationReference(baseRef, container).resolvedApiItem;
    if (!(base instanceof ApiClass)) return new Set();
    const concrete = base.findMembersWithInheritance().items.filter((member) => !isAbstract(member));
    return new Set(concrete.map(memberKey));
}

// fields never get override. typescript forbids `declare override` and the .d.ts hides `declare`
export function overridesBaseMember(member: ApiItem, baseKeys: ReadonlySet<string>): boolean {
    const callable = apiKindToDocKind(member) === DocKind.Method || accessorRole(member) !== null;
    return callable && baseKeys.has(memberKey(member));
}
