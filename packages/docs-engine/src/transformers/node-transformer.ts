import {
    ReflectionKind,
    type ContainerReflection,
    type DeclarationReflection,
    type ProjectReflection,
    type SignatureReflection
} from 'typedoc';

import { toGlobalId } from '../ids';
import { kindLabel } from '../kinds';
import { slugForNode } from '../slugger';
import { mapFlags } from './flag-mapper';
import {
    mapGroups,
    mapInheritance,
    mapReference,
    mapSignature,
    mapSources,
    mapType,
    mapTypeParameters,
    primaryUrlFromSources
} from './mappers';
import { formatRenderedDeclarationHeader, renderDeclarationHeader } from './signature-renderer';
import { registerNode, type TransformContext } from './transform-context';
import { hasRefType, hasSources, hasVariant } from './type-helpers';

import type { DocInheritance, DocManifestPackage, DocNode, SourcePackage } from '../types';

const formatLiteralValue = (value: unknown): string | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'bigint') return `${value.toString()}n`;
    return undefined;
};

const extractEnumLiteralValue = (
    reflection: DeclarationReflection,
    mappedType: DocNode['type']
): string | undefined => {
    const literalFromReflection = (reflection.type as { type?: string; value?: unknown } | undefined) ?? null;
    if (literalFromReflection?.type === 'literal' && 'value' in literalFromReflection) {
        const formatted = formatLiteralValue(literalFromReflection.value);
        if (formatted !== undefined) return formatted;
    }

    if (mappedType && typeof mappedType === 'object' && (mappedType as { type?: string }).type === 'literal') {
        const literal = mappedType as { value?: unknown };
        if ('value' in literal) return formatLiteralValue(literal.value);
    }

    return undefined;
};

const buildPathSegments = (
    reflection: ProjectReflection | DeclarationReflection,
    _context: TransformContext,
    parentPath: readonly string[]
): string[] => {
    const label = typeof reflection.name === 'string' && reflection.name.length > 0 ? reflection.name : 'anonymous';
    if (reflection.kind === ReflectionKind.Project) return [];
    return parentPath.length === 0 ? [label] : [...parentPath, label];
};

const kindLabelOf = (kind: ReflectionKind): string => kindLabel(kind);

const createEmptyInheritance = (): DocInheritance => ({
    extends: [],
    implements: [],
    extendedBy: [],
    implementedBy: []
});

interface CreateNodeParams {
    reflection: ProjectReflection | DeclarationReflection;
    reflectionName: string;
    packageName: string;
    sourcePackage: SourcePackage;
    path: string[];
    qualifiedName: string;
    slug: string;
}

export class NodeTransformer {
    constructor(private readonly context: TransformContext) {}

    transform(project: ProjectReflection): DocNode {
        return this.visit(project, []);
    }

    private visit(reflection: ProjectReflection | DeclarationReflection, parentPath: readonly string[]): DocNode {
        const path = buildPathSegments(reflection, this.context, parentPath);
        const qualifiedName = path.join('.');
        const slug = slugForNode(this.context.slugger, path);
        const packageName = String(this.context.manifest.name);
        const reflectionName =
            typeof reflection.name === 'string' && reflection.name.length > 0 ? reflection.name : packageName;

        const sourcePackage = this.resolveSourcePackage(reflection, packageName);

        const node = this.createBaseNode({
            reflection,
            reflectionName,
            packageName,
            sourcePackage,
            path,
            qualifiedName,
            slug
        });

        registerNode(this.context, node);

        const container = reflection as ContainerReflection;
        const declaration = reflection.kind !== ReflectionKind.Project ? (reflection as DeclarationReflection) : null;

        if (declaration) {
            this.applyDeclarationDetails(node, declaration);
            this.populateSignatures(node, declaration);
        }

        this.populateChildren(node, container, path);
        this.applyGroups(node, container);

        return node;
    }

    private packageVersion(): string | undefined {
        const version = this.context.manifest.version;
        return typeof version === 'string' && version.length > 0 ? version : undefined;
    }

    private createBaseNode(params: CreateNodeParams): DocNode {
        const { reflection, reflectionName, packageName, sourcePackage, path, qualifiedName, slug } = params;
        const node: DocNode = {
            id: reflection.id,
            key: toGlobalId(packageName, reflection.id),
            name: reflectionName,
            packageName,
            sourcePackage,
            path,
            qualifiedName,
            slug,
            kind: reflection.kind,
            kindLabel: kindLabelOf(reflection.kind),
            flags: mapFlags(reflection),
            comment: this.context.commentTransformer.toDocComment(reflection.comment),
            typeParameters: [],
            signatures: [],
            children: [],
            groups: [],
            sources: [],
            inheritance: createEmptyInheritance(),
            overwrites: null,
            inheritedFrom: null,
            implementationOf: null
        };

        const version = this.packageVersion();
        if (version) node.packageVersion = version;

        return node;
    }

    private resolveManifestPackage(name: string): DocManifestPackage | null {
        if (!name) {
            return null;
        }

        const direct = this.context.packagesByName.get(name);
        if (direct) {
            return direct;
        }

        const normalized = name.trim().toLowerCase();
        if (!normalized) {
            return null;
        }

        return this.context.packagesByAlias.get(normalized) ?? null;
    }

    // eslint-disable-next-line complexity, max-statements
    private resolveSourcePackage(
        reflection: ProjectReflection | DeclarationReflection,
        fallbackPackageName: string
    ): SourcePackage {
        const fallback = this.resolveManifestPackage(fallbackPackageName);
        let name = fallback?.name ?? fallbackPackageName;
        let version = fallback?.version ?? this.packageVersion() ?? '';
        let matchedManifest = Boolean(fallback);

        const applyCandidate = (candidate: string | null | undefined, inferredVersion?: string): void => {
            if (!candidate) {
                return;
            }

            const manifest = this.resolveManifestPackage(candidate);
            if (manifest) {
                name = manifest.name;
                const manifestVersion = typeof manifest.version === 'string' ? manifest.version : '';
                if (manifestVersion.length > 0) {
                    version = manifestVersion;
                } else if (inferredVersion && inferredVersion.length > 0 && version.length === 0) {
                    version = inferredVersion;
                }
                matchedManifest = true;
                return;
            }

            if (!matchedManifest) {
                name = candidate;
                if (inferredVersion && inferredVersion.length > 0 && version.length === 0) {
                    version = inferredVersion;
                }
            }
        };

        if (
            hasVariant(reflection) &&
            hasRefType(reflection) &&
            reflection.variant === 'reference' &&
            reflection.type?.type === 'reference'
        ) {
            const fromPkg = reflection.type.package ?? reflection.type.packageName;
            if (typeof fromPkg === 'string' && fromPkg.length > 0) {
                applyCandidate(fromPkg);
            }
        }

        if (hasSources(reflection) && Array.isArray(reflection.sources)) {
            for (const s of reflection.sources) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                const file = s.fullFileName ?? s.fileName ?? '';

                const pnpm = file.match(/[\\/](?:node_modules)[\\/]\.pnpm[\\/](?<slug>[^\\/]+?)\\b[\\/]/);
                if (pnpm?.groups?.slug) {
                    const slug = pnpm.groups.slug;
                    const atIdx = slug.lastIndexOf('@');
                    if (atIdx > 0) {
                        const rawName = slug.slice(0, atIdx);
                        const ver = slug.slice(atIdx + 1);
                        const inferredName = rawName.startsWith('@')
                            ? rawName.replace(/\+/g, '/')
                            : rawName.replace(/\+/g, '/');

                        applyCandidate(inferredName, ver);
                    }
                }

                const nm = file.match(/(?:^|[\\/])node_modules[\\/](?<pkg>@[^\\/]+[\\/][^\\/]+|[^\\/]+)/);
                if (nm?.groups?.pkg) {
                    applyCandidate(nm.groups.pkg);
                }

                const mono = file.match(/(?:^|[\\/])packages[\\/](?<pkg>@[^\\/]+[\\/][^\\/]+|[^\\/]+)[\\/]/);
                if (mono?.groups?.pkg) {
                    applyCandidate(mono.groups.pkg);
                }

                if (version.length > 0 && matchedManifest) {
                    break;
                }
            }
        }

        return { name, version } satisfies SourcePackage;
    }

    private applyDeclarationDetails(node: DocNode, reflection: DeclarationReflection): void {
        const mappedType = mapType(this.context, reflection.type);
        if (mappedType !== null) node.type = mappedType;

        node.typeParameters = mapTypeParameters(this.context, reflection.typeParameters);
        node.sources = mapSources(reflection.sources);
        const inheritance = mapInheritance(this.context, reflection);
        node.inheritance = inheritance;
        node.header = renderDeclarationHeader(this.context, node.name, {
            kind: node.kind,
            flags: node.flags,
            typeParams: node.typeParameters,
            inheritance,
            valueType: node.type ?? undefined
        });
        node.headerText = formatRenderedDeclarationHeader(node.header);
        node.overwrites = mapReference(this.context, reflection.overwrites);
        node.inheritedFrom = mapReference(this.context, reflection.inheritedFrom);
        node.implementationOf = mapReference(this.context, reflection.implementationOf);

        const def = (reflection as unknown as { defaultValue?: string }).defaultValue;
        if (typeof def === 'string' && def.length > 0) node.defaultValue = def;

        if (node.defaultValue === undefined && reflection.kind === ReflectionKind.EnumMember) {
            const literalValue = extractEnumLiteralValue(reflection, node.type);
            if (literalValue !== undefined) node.defaultValue = literalValue;
        }

        const sourceUrl = primaryUrlFromSources(reflection.sources);
        if (typeof sourceUrl === 'string') node.sourceUrl = sourceUrl;
    }

    private populateSignatures(node: DocNode, reflection: DeclarationReflection): void {
        const acc = reflection;
        const out: SignatureReflection[] = [];

        if (Array.isArray(reflection.signatures)) out.push(...reflection.signatures);
        if (acc.getSignature) out.push(acc.getSignature);
        if (acc.setSignature) out.push(acc.setSignature);

        const fragments = new Set<string>();

        node.signatures = out.map((sig, i) =>
            mapSignature(this.context, sig, { id: node.id, name: node.name, slug: node.slug }, i, fragments)
        );
    }

    private populateChildren(node: DocNode, container: ContainerReflection, parentPath: readonly string[]): void {
        const children = Array.isArray(container.children) ? container.children : [];
        for (const child of children) {
            const childNode = this.visit(child, parentPath);
            node.children.push(childNode);
        }
    }

    private applyGroups(node: DocNode, container: ContainerReflection): void {
        if (!Array.isArray(container.groups) || container.groups.length === 0) return;
        node.groups = container.groups.map((group) => mapGroups(group, node.packageName));
    }
}
