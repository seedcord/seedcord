import {
    ReflectionKind,
    type Comment,
    type DeclarationReflection,
    type ParameterReflection,
    type Reflection,
    type SignatureReflection,
    type SomeType
} from 'typedoc';

import type { DocFlags } from '../types';

const hasModifier = (comment: Comment | null, modifier: '@internal' | '@external'): boolean => {
    const modifiers = comment?.modifierTags;
    return modifiers?.has(modifier) ?? false;
};

const hasDecoratorBlockTag = (comment: Comment | null): boolean => {
    const blockTags = comment?.blockTags;
    return Array.isArray(blockTags) ? blockTags.some((tag) => tag.tag === '@decorator') : false;
};

const hasDecoratorMetadata = (reflection: Reflection | ParameterReflection): boolean => {
    const decorators = (reflection as { decorators?: unknown[] }).decorators;
    return Array.isArray(decorators) && decorators.length > 0;
};

const CALLABLE_KINDS: ReflectionKind[] = [
    ReflectionKind.Function,
    ReflectionKind.Method,
    ReflectionKind.CallSignature,
    ReflectionKind.ConstructorSignature,
    ReflectionKind.Constructor,
    ReflectionKind.Accessor,
    ReflectionKind.GetSignature,
    ReflectionKind.SetSignature
];

const PROMISE_TYPE_NAMES = new Set(['Promise', 'PromiseLike']);

interface AsyncDetectionContext {
    types: Set<SomeType>;
    signatures: Set<SignatureReflection>;
}

const createAsyncDetectionContext = (): AsyncDetectionContext => ({
    types: new Set<SomeType>(),
    signatures: new Set<SignatureReflection>()
});

function resolveIsAsync(reflection: Reflection | ParameterReflection): boolean {
    if (Boolean((reflection.flags as { isAsync?: boolean }).isAsync)) {
        return true;
    }

    if (reflection.isSignature()) {
        return signatureIsAsync(reflection, createAsyncDetectionContext());
    }

    if (!reflection.isDeclaration()) {
        return false;
    }

    if (!reflection.kindOf(CALLABLE_KINDS)) {
        return false;
    }

    const signatures = collectDeclarationSignatures(reflection);
    if (signatures.length === 0) {
        return returnsPromise(reflection.type, createAsyncDetectionContext());
    }

    const context = createAsyncDetectionContext();
    return signatures.some((signature) => signatureIsAsync(signature, context));
}

function collectDeclarationSignatures(declaration: DeclarationReflection): SignatureReflection[] {
    const signatures: SignatureReflection[] = [...declaration.getNonIndexSignatures()];
    const getter = declaration.getSignature;
    const setter = declaration.setSignature;

    if (getter) {
        signatures.push(getter);
    }

    if (setter) {
        signatures.push(setter);
    }

    if (signatures.length === 0 && Array.isArray(declaration.signatures)) {
        signatures.push(...declaration.signatures);
    }

    return signatures;
}

function signatureIsAsync(signature: SignatureReflection | undefined, context: AsyncDetectionContext): boolean {
    if (!signature || context.signatures.has(signature)) {
        return false;
    }

    context.signatures.add(signature);

    if (Boolean((signature.flags as { isAsync?: boolean }).isAsync)) {
        return true;
    }

    return returnsPromise(signature.type, context);
}

const hasDeprecatedTag = (comment: Comment | null): boolean => {
    if (!comment) return false;
    if (comment.getTag('@deprecated')) return true;

    const blocks = comment.blockTags;
    if (blocks.some((t) => t.tag === '@deprecated')) return true;

    const mods = comment.modifierTags;
    return mods.has('@deprecated');
};

const isSignatureDeprecated = (sig: SignatureReflection | undefined): boolean => {
    if (!sig) return false;
    if (hasDeprecatedTag(sig.comment ?? null)) return true;
    return Boolean((sig.flags as { isDeprecated?: boolean }).isDeprecated);
};

const isDeclarationDeprecated = (decl: DeclarationReflection): boolean => {
    if (hasDeprecatedTag(decl.comment ?? null)) return true;
    if (Boolean((decl.flags as { isDeprecated?: boolean }).isDeprecated)) return true;

    const sigs = collectDeclarationSignatures(decl);
    if (sigs.length === 0) return false;

    return sigs.every((s) => isSignatureDeprecated(s));
};

function resolveIsDeprecated(reflection: Reflection | ParameterReflection): boolean {
    if (hasDeprecatedTag(reflection.comment ?? null)) {
        return true;
    }
    if (Boolean((reflection.flags as { isDeprecated?: boolean }).isDeprecated)) {
        return true;
    }
    if (reflection.isSignature()) {
        return isSignatureDeprecated(reflection);
    }
    if (reflection.isDeclaration() && reflection.kindOf(CALLABLE_KINDS)) {
        return isDeclarationDeprecated(reflection);
    }
    return false;
}

function returnsPromise(type: SomeType | undefined, context: AsyncDetectionContext): boolean {
    if (!type || context.types.has(type)) {
        return false;
    }

    context.types.add(type);

    const kind = (type as { type?: string }).type;
    switch (kind) {
        case 'reference':
            return isPromiseReference(type as { name?: string; typeArguments?: SomeType[] }, context);
        case 'union':
        case 'intersection':
            return compositeHasPromise(type as { types?: SomeType[] }, context);
        case 'conditional':
            return conditionalHasPromise(
                type as {
                    checkType?: SomeType;
                    extendsType?: SomeType;
                    trueType?: SomeType;
                    falseType?: SomeType;
                },
                context
            );
        case 'reflection':
            return reflectionHasPromise(type as { declaration?: DeclarationReflection }, context);
        case 'array':
        case 'rest':
        case 'optional':
            return elementTypeHasPromise(type as { elementType?: SomeType }, context);
        case 'typeOperator':
            return returnsPromise((type as { target?: SomeType }).target, context);
        case 'tuple':
            return tupleHasPromise(type as { elements?: (SomeType | { type?: SomeType })[] }, context);
        case 'templateLiteral':
            return templateLiteralHasPromise(type as { tail?: { type: SomeType }[] }, context);
        case 'namedTupleMember':
            return namedTupleMemberHasPromise(type as unknown as { element?: SomeType; type?: SomeType }, context);
        default:
            return false;
    }
}

function isPromiseReference(
    reference: { name?: string; typeArguments?: SomeType[] },
    context: AsyncDetectionContext
): boolean {
    if (reference.name && PROMISE_TYPE_NAMES.has(reference.name)) {
        return true;
    }

    const args = reference.typeArguments ?? [];
    return args.some((arg) => returnsPromise(arg, context));
}

function compositeHasPromise(container: { types?: SomeType[] }, context: AsyncDetectionContext): boolean {
    const variants = container.types ?? [];
    return variants.some((variant) => returnsPromise(variant, context));
}

function conditionalHasPromise(
    conditional: { checkType?: SomeType; extendsType?: SomeType; trueType?: SomeType; falseType?: SomeType },
    context: AsyncDetectionContext
): boolean {
    return (
        returnsPromise(conditional.checkType, context) ||
        returnsPromise(conditional.extendsType, context) ||
        returnsPromise(conditional.trueType, context) ||
        returnsPromise(conditional.falseType, context)
    );
}

function reflectionHasPromise(
    reflectionType: { declaration?: DeclarationReflection },
    context: AsyncDetectionContext
): boolean {
    const declaration = reflectionType.declaration;
    if (!declaration) {
        return false;
    }

    const nestedSignatures = collectDeclarationSignatures(declaration);
    if (nestedSignatures.length > 0) {
        return nestedSignatures.some((signature) => signatureIsAsync(signature, context));
    }

    return returnsPromise(declaration.type, context);
}

function elementTypeHasPromise(carrier: { elementType?: SomeType }, context: AsyncDetectionContext): boolean {
    return returnsPromise(carrier.elementType, context);
}

function tupleHasPromise(
    tuple: { elements?: (SomeType | { type?: SomeType })[] },
    context: AsyncDetectionContext
): boolean {
    const elements = tuple.elements ?? [];
    return elements.some((element) => {
        const entry = (element as { type?: SomeType }).type ?? (element as SomeType | undefined);
        return returnsPromise(entry, context);
    });
}

function templateLiteralHasPromise(template: { tail?: { type: SomeType }[] }, context: AsyncDetectionContext): boolean {
    const tail = template.tail ?? [];
    return tail.some((part) => returnsPromise(part.type, context));
}

function namedTupleMemberHasPromise(
    member: { element?: SomeType; type?: SomeType },
    context: AsyncDetectionContext
): boolean {
    return returnsPromise(member.element ?? member.type, context);
}

const resolveAccessor = (reflection: Reflection | ParameterReflection): DocFlags['accessor'] => {
    if (!('kind' in reflection) || reflection.kind !== ReflectionKind.Accessor) {
        return null;
    }

    const { getSignature, setSignature } = reflection as DeclarationReflection;
    const hasGetter = Boolean(getSignature);
    const hasSetter = Boolean(setSignature);

    if (hasGetter && hasSetter) {
        return 'getter-setter';
    }
    if (hasGetter) {
        return 'getter';
    }
    if (hasSetter) {
        return 'setter';
    }
    return null;
};

const isInheritedReflection = (reflection: Reflection | ParameterReflection): boolean => {
    if ('inheritedFrom' in reflection && reflection.inheritedFrom) {
        return true;
    }
    if ('implementationOf' in reflection && reflection.implementationOf) {
        return true;
    }
    if ('overwrites' in reflection && reflection.overwrites) {
        return true;
    }
    return false;
};

const isOverwritingReflection = (reflection: Reflection | ParameterReflection): boolean => {
    if ('overwrites' in reflection && reflection.overwrites) {
        return true;
    }
    return false;
};

export const mapFlags = (reflection: Reflection | ParameterReflection): DocFlags => {
    const flags = reflection.flags;
    const access = flags.isPrivate ? 'private' : flags.isProtected ? 'protected' : flags.isPublic ? 'public' : null;
    const comment = (reflection as { comment?: Comment | null }).comment ?? null;
    const accessor = resolveAccessor(reflection);
    const isDecorator = hasDecoratorBlockTag(comment) || hasDecoratorMetadata(reflection);
    const inherited = Boolean((flags as { isInherited?: boolean }).isInherited) || isInheritedReflection(reflection);
    const asyncBehavior = resolveIsAsync(reflection);

    return {
        access,
        accessor,
        isStatic: Boolean(flags.isStatic),
        isAbstract: Boolean(flags.isAbstract),
        isConst: Boolean((flags as { isConst?: boolean }).isConst),
        isReadonly: Boolean(flags.isReadonly),
        isOptional: Boolean(flags.isOptional),
        isAsync: asyncBehavior,
        isDeprecated: resolveIsDeprecated(reflection),
        isInherited: inherited,
        isDecorator,
        isInternal: Boolean((flags as { isInternal?: boolean }).isInternal) || hasModifier(comment, '@internal'),
        isExternal: Boolean((flags as { isExternal?: boolean }).isExternal) || hasModifier(comment, '@external'),
        isOverwriting: isOverwritingReflection(reflection)
    };
};
