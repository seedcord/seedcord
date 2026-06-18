import {
    ApiDocumentedItem,
    ApiExportedMixin,
    ApiInitializerMixin,
    ApiItemContainerMixin,
    ApiItemKind,
    ApiParameterListMixin,
    ApiReturnTypeMixin,
    ApiTypeParameterListMixin,
    type ApiItem,
    type ApiModel,
    type ApiPackage
} from '@microsoft/api-extractor-model';

import {
    accessorHasSetter,
    accessorRole,
    buildAccessorSignature,
    buildDeclarationHeader,
    emptyInheritance,
    explicitModifiers,
    groupOverloads,
    inheritedFromRef,
    paramFlags,
    synthGroups,
    type AeShapes
} from '@model/adapter-helpers';
import { canonicalKey, referenceFromCanonical } from '@model/canonical-ref';
import { excerptToInlineType } from '@model/excerpt-renderer';
import { buildFlags, type DerivedFlagBits } from '@model/flags';
import { apiKindToDocKind, DocKind, frozenKindLabel } from '@model/kinds';
import {
    buildComment,
    buildParamComment,
    buildReturnsComment,
    buildTypeParamComment,
    type LinkResolver
} from '@model/tsdoc-comment';
import { Slugger, slugForNode } from '@src/Slugger';
import { formatRenderedDeclarationHeader, formatRenderedSignature } from '@transformers/signature-renderer';

import type {
    DocCommentBlockTag,
    DocFlags,
    DocManifestPackage,
    DocNode,
    DocReference,
    DocSignature,
    DocSignatureParameter,
    DocSource,
    DocTypeParameter,
    RenderedSignature,
    SigPart,
    SourcePackage
} from '@src/types';

const CALLABLE = new Set<number>([DocKind.Function, DocKind.Method, DocKind.Constructor]);

interface MemberContext {
    inheritedFrom: DocReference | null;
    ownClassMember: boolean;
}
const TOP_LEVEL: MemberContext = { inheritedFrom: null, ownClassMember: false };

export class ApiAdapter {
    private readonly slugger = new Slugger();
    private idCounter = 1;

    constructor(
        private readonly manifest: DocManifestPackage,
        private readonly model: ApiModel
    ) {}

    transform(pkg: ApiPackage): DocNode {
        const root = this.baseNode(pkg, [], pkg.displayName, true);
        const members = pkg.entryPoints[0]?.members ?? [];
        root.children = this.visitMembers(members, []);
        root.groups = synthGroups(root.children);
        const reexports = this.buildReexports();
        if (reexports.length > 0) root.reexports = reexports;
        return root;
    }

    // Each re-exported symbol maps to a cross-package reference to its declaring package, so the
    // umbrella page href targets that package's canonical page instead of a duplicate.
    private buildReexports(): DocReference[] {
        return (this.manifest.reexports ?? []).map((entry) => ({
            name: entry.name,
            qualifiedName: entry.name,
            packageName: entry.owner
        }));
    }

    private resolveLink(): LinkResolver {
        return (codeDestination, fallbackText) => {
            // justified: codeDestination is the opaque TSDoc DeclarationReference forwarded to AE;
            // resolveDeclarationReference returns an error result (never throws) for an unresolved link.
            const resolved = this.model.resolveDeclarationReference(
                codeDestination as Parameters<ApiModel['resolveDeclarationReference']>[0],
                undefined
            );
            const target = resolved.resolvedApiItem;
            if (target?.canonicalReference) {
                return referenceFromCanonical(target.canonicalReference, fallbackText);
            }
            return undefined;
        };
    }

    private baseNode(
        item: ApiItem,
        parentPath: string[],
        name: string,
        isPackageRoot: boolean,
        member: MemberContext = TOP_LEVEL
    ): DocNode {
        const path = isPackageRoot ? [] : [...parentPath, name];
        const kind = isPackageRoot ? DocKind.Project : apiKindToDocKind(item);
        const flags = isPackageRoot ? buildFlags(item) : this.flagsFor(item, kind, member.ownClassMember);
        if (member.inheritedFrom) flags.isInherited = true;

        const qualifiedName = path.join('.');
        const sources = this.sourcesFor(qualifiedName);
        const node: DocNode = {
            id: this.idCounter++,
            key: canonicalKey(item.canonicalReference),
            name,
            packageName: this.manifest.name,
            sourcePackage: this.sourcePackage(),
            path,
            qualifiedName,
            slug: slugForNode(this.slugger, path),
            kind,
            kindLabel: frozenKindLabel(kind),
            isExported: ApiExportedMixin.isBaseClassOf(item) ? item.isExported : true,
            flags,
            comment: item instanceof ApiDocumentedItem ? buildComment(item.tsdocComment, this.resolveLink()) : null,
            typeParameters: this.typeParamsFor(item),
            signatures: [],
            children: [],
            groups: [],
            sources,
            inheritance: emptyInheritance(),
            overwrites: null,
            inheritedFrom: member.inheritedFrom,
            implementationOf: null
        };
        if (this.manifest.version) node.packageVersion = this.manifest.version;

        if (ApiInitializerMixin.isBaseClassOf(item)) {
            const initializer = item.initializerExcerpt?.text.trim();
            if (initializer) node.defaultValue = initializer;
        }

        const sourceUrl = sources[0]?.url;
        if (sourceUrl) node.sourceUrl = sourceUrl;

        if (!isPackageRoot) this.applyHeader(node, item, kind, flags);
        return node;
    }

    private sourcePackage(): SourcePackage {
        return { name: this.manifest.name, version: this.manifest.version };
    }

    private flagsFor(item: ApiItem, kind: number, ownClassMember: boolean): DocFlags {
        const derived: DerivedFlagBits = {};
        if (item instanceof ApiDocumentedItem && item.tsdocComment) {
            derived.isDeprecated = Boolean(item.tsdocComment.deprecatedBlock);
            derived.isDecorator = item.tsdocComment.customBlocks.some(
                (block) => block.blockTag.tagNameWithUpperCase === '@DECORATOR'
            );
        }
        if (kind === DocKind.Variable) {
            derived.isConst = (item as AeShapes).isReadonly ?? false;
        }
        if (ApiReturnTypeMixin.isBaseClassOf(item)) {
            derived.isAsync = /^Promise\s*</.test(item.returnTypeExcerpt.text.trim());
        }
        // Modifiers written in source (the excerpt prefix) win; matching TypeDoc, an own (non-
        // inherited) class member with no explicit modifier still renders the implicit `public`,
        // while inherited / interface / top-level declarations carry no access modifier.
        const explicit = explicitModifiers(item, item.displayName);
        derived.access = explicit.access ?? (ownClassMember ? 'public' : null);
        derived.isReadonly = explicit.isReadonly;
        return buildFlags(item, derived);
    }

    private typeParamsFor(item: ApiItem): DocTypeParameter[] {
        if (!ApiTypeParameterListMixin.isBaseClassOf(item)) return [];
        const tsdoc = item instanceof ApiDocumentedItem ? item.tsdocComment : undefined;
        const resolveLink = this.resolveLink();
        return item.typeParameters.map((tp, index) => {
            const docTp: DocTypeParameter = { id: index, name: tp.name, flags: { isOptional: tp.isOptional } };
            const comment = buildTypeParamComment(tsdoc, tp.name, resolveLink);
            if (comment) docTp.comment = comment;
            const constraint = excerptToInlineType(tp.constraintExcerpt);
            if (constraint) docTp.constraint = constraint;
            const defaultType = excerptToInlineType(tp.defaultTypeExcerpt);
            if (defaultType) docTp.default = defaultType;
            return docTp;
        });
    }

    // Source positions come from the generator's TS-compiler pass (manifest.sources), keyed by the
    // same dotted qualified name a node builds from its path. API Extractor's own fileUrlPath points
    // into the bundled `dist/index.d.mts` rollup and carries no line/column, so it is not used.
    private sourcesFor(qualifiedName: string): DocSource[] {
        const entries = this.manifest.sources?.[qualifiedName];
        if (!entries) return [];
        return entries.map((entry) => {
            const source: DocSource = { fileName: entry.file, line: entry.line, character: entry.column };
            if (entry.url) source.url = entry.url;
            return source;
        });
    }

    private applyHeader(node: DocNode, item: ApiItem, kind: number, flags: DocFlags): void {
        const header = buildDeclarationHeader(item, node.name, kind, flags);
        node.header = header;
        node.headerText = formatRenderedDeclarationHeader(header);
    }

    private visitMembers(members: readonly ApiItem[], parentPath: string[], owningContainer?: ApiItem): DocNode[] {
        const nodes: DocNode[] = [];
        for (const group of groupOverloads(members)) {
            const primary = group[0];
            if (!primary) continue;
            // API Extractor names a constructor `(constructor)`; the engine + URL grammar expect the
            // bare `constructor` (sets the `#constructor` anchor and the `Owner.constructor` slug).
            const memberName = apiKindToDocKind(primary) === DocKind.Constructor ? 'constructor' : primary.displayName;
            const inheritedFrom = inheritedFromRef(primary, owningContainer);
            // Own (non-inherited) class members render the implicit `public`; constructors do not
            // (TypeDoc shows `public` on a constructor only when written explicitly).
            const ownClassMember =
                inheritedFrom === null &&
                owningContainer?.kind === ApiItemKind.Class &&
                apiKindToDocKind(primary) !== DocKind.Constructor;
            const node = this.baseNode(primary, parentPath, memberName, false, { inheritedFrom, ownClassMember });

            if (CALLABLE.has(node.kind)) {
                node.signatures = group.map((sig, index) => this.buildSignature(sig, node, index, group.length));
                // The signature(s) carry the doc comment, matching TypeDoc (where a callable's
                // declaration comment is empty); without this the summary renders twice, once as the
                // member description and once as the node's "shared" documentation.
                node.comment = null;
            } else if (accessorRole(primary)) {
                this.applyAccessor(node, group);
            }

            if (ApiItemContainerMixin.isBaseClassOf(primary)) {
                // Classes + interfaces flatten inherited members (matching TypeDoc); the inherited
                // ones are tagged via owningContainer in the recursive call.
                const nodeKind: number = node.kind;
                const flattened =
                    nodeKind === DocKind.Class || nodeKind === DocKind.Interface
                        ? primary.findMembersWithInheritance().items
                        : primary.members;
                node.children = this.visitMembers(flattened, node.path, primary);
                node.groups = synthGroups(node.children);
            }
            nodes.push(node);
        }
        return nodes;
    }

    private applyAccessor(node: DocNode, group: ApiItem[]): void {
        node.kind = DocKind.Accessor;
        node.kindLabel = frozenKindLabel(DocKind.Accessor);
        const primary = group[0];
        if (!primary) return;
        // AE never emits a standalone setter: a set-only accessor surfaces as a `set `-prefixed
        // property, while a get-only OR get+set pair both surface as a `get `-prefixed property
        // (the pair distinguished only by not being readonly).
        const signatures: DocSignature[] = [];
        const deps = { nextId: (): number => this.idCounter++, resolveLink: this.resolveLink() };
        if (accessorRole(primary) === 'setter') {
            node.flags.accessor = 'setter';
            signatures.push(buildAccessorSignature(primary, node, 'setter', 0, deps));
        } else {
            const hasSetter = accessorHasSetter(primary);
            node.flags.accessor = hasSetter ? 'getter-setter' : 'getter';
            signatures.push(buildAccessorSignature(primary, node, 'getter', 0, deps));
            if (hasSetter) signatures.push(buildAccessorSignature(primary, node, 'setter', 1, deps));
        }
        node.signatures = signatures;
        // The first signature carries the accessor's doc comment (matching the CALLABLE branch);
        // leaving it on the node too would render the summary twice (description + shared docs).
        node.comment = null;
        // An accessor renders through its get/set signatures, not a property-header type.
        if (node.header?.type) {
            delete node.header.type;
            node.headerText = formatRenderedDeclarationHeader(node.header);
        }
    }

    private signatureParameters(item: ApiItem): {
        docParams: DocSignatureParameter[];
        renderParams: RenderedSignature['parameters'];
    } {
        if (!ApiParameterListMixin.isBaseClassOf(item)) return { docParams: [], renderParams: [] };
        const paramDoc = item instanceof ApiDocumentedItem ? item.tsdocComment : undefined;
        const docParams = item.parameters.map((param, paramIndex) => {
            const docParam: DocSignatureParameter = {
                id: paramIndex,
                name: param.name,
                kind: DocKind.Parameter,
                flags: paramFlags(param.isOptional)
            };
            const { comment, defaultValue } = buildParamComment(paramDoc, param.name, this.resolveLink());
            if (comment) docParam.comment = comment;
            if (defaultValue !== undefined) docParam.defaultValue = defaultValue;
            return docParam;
        });
        const renderParams = item.parameters.map((param) => {
            const entry: RenderedSignature['parameters'][number] = { name: param.name, optional: param.isOptional };
            const type = excerptToInlineType(param.parameterTypeExcerpt);
            if (type) entry.type = type;
            return entry;
        });
        return { docParams, renderParams };
    }

    private buildSignatureRender(
        item: ApiItem,
        signatureName: string,
        renderParameters: RenderedSignature['parameters'],
        typeParameters: DocTypeParameter[]
    ): RenderedSignature {
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: signatureName }] satisfies SigPart[],
            parameters: renderParameters
        };
        if (typeParameters.length > 0) {
            render.typeParams = typeParameters.map((tp) => ({ name: tp.name }));
        }
        if (ApiReturnTypeMixin.isBaseClassOf(item)) {
            const returnType = excerptToInlineType(item.returnTypeExcerpt);
            if (returnType) render.returnType = returnType;
        }
        return render;
    }

    private buildSignature(item: ApiItem, owner: DocNode, index: number, total: number): DocSignature {
        const overloadIndex = ApiParameterListMixin.isBaseClassOf(item) ? item.overloadIndex - 1 : index;
        const fragment = total > 1 ? `overload-${overloadIndex + 1}` : '';
        const source = this.signatureSource(owner, overloadIndex);

        const { docParams: parameters, renderParams: renderParameters } = this.signatureParameters(item);

        // TypeDoc names a constructor's signature after the owning class (renders `MockClass(...)`,
        // not `constructor(...)`); mirror that so the rendered signature stays identical.
        const signatureName =
            apiKindToDocKind(item) === DocKind.Constructor ? (item.parent?.displayName ?? owner.name) : owner.name;

        // Each overload owns its type parameters; `owner.typeParameters` is the first overload's
        // list, so reusing it would mislabel the others (e.g. buildSlashRoute's overloads differ).
        const typeParameters = this.typeParamsFor(item);
        const render = this.buildSignatureRender(item, signatureName, renderParameters, typeParameters);

        const comment = item instanceof ApiDocumentedItem ? buildComment(item.tsdocComment, this.resolveLink()) : null;
        const returnsComment =
            item instanceof ApiDocumentedItem ? buildReturnsComment(item.tsdocComment, this.resolveLink()) : null;

        const signature: DocSignature = {
            id: this.idCounter++,
            name: signatureName,
            kind: owner.kind,
            fragment,
            anchor: fragment,
            overloadIndex,
            kindLabel: owner.kindLabel,
            // Snapshot so a signature never aliases the node's mutable DocFlags (applyAccessor mutates it).
            flags: { ...owner.flags },
            parameters,
            typeParameters,
            comment,
            sources: source.sources,
            render,
            renderText: formatRenderedSignature(render),
            overwrites: null,
            inheritedFrom: null,
            implementationOf: null
        };
        if (source.sourceUrl) signature.sourceUrl = source.sourceUrl;
        if (returnsComment) signature.returnsComment = returnsComment;
        const throwsTags = comment?.blockTags.filter((tag: DocCommentBlockTag) => tag.tag === '@throws');
        if (throwsTags && throwsTags.length > 0) signature.throws = throwsTags;
        return signature;
    }

    // owner.sources is one entry per documented overload in source-declaration order, matching API
    // Extractor's overloadIndex (TS requires overloads adjacent); a missing index falls back to primary.
    private signatureSource(owner: DocNode, overloadIndex: number): { sources: DocSource[]; sourceUrl?: string } {
        const overloadSource = owner.sources[overloadIndex];
        const sources = overloadSource ? [overloadSource] : owner.sources;
        const sourceUrl = overloadSource?.url ?? owner.sourceUrl;
        return sourceUrl ? { sources, sourceUrl } : { sources };
    }
}
