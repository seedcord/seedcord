import { beforeAll, describe, expect, it } from 'vitest';

import { DocKind } from '#model/kinds';
import { AnchorStrategy } from '#routing/AnchorStrategy';
import { ReferenceResolver } from '#routing/ReferenceResolver';
import { orderedPackageCandidates } from '#routing/resolve-helpers';

import { MOCK_PACKAGE_FULL_NAME } from './utils/constants';
import { getEngine, getManifest, getMockPackage, getNodeBySlug } from './utils/test-helpers';

import type { PackageRegistry } from '#routing/lookup';
import type { DocsEngine } from '#src/DocsEngine';
import type { DocNode, DocPackageModel } from '#src/types';

let engine: DocsEngine;
let pkg: DocPackageModel;

const findChildNode = (parent: DocNode, slugSuffix: string): DocNode => {
    const match = parent.children.find((child) => child.slug === `${parent.slug}/${slugSuffix}`);
    if (!match) {
        throw new Error(`Expected child ${slugSuffix} under ${parent.slug}`);
    }
    return match;
};

describe('DocsEngine mock package integration', () => {
    beforeAll(async () => {
        engine = await getEngine();
        pkg = await getMockPackage();
    });

    it('loads manifest metadata and package list', async () => {
        const manifest = await getManifest();
        const packages = engine.listPackages();
        expect(packages).toEqual([MOCK_PACKAGE_FULL_NAME]);

        expect(manifest.packages).toHaveLength(1);
        const [manifestPackage] = manifest.packages;
        expect(manifestPackage!.name).toBe(MOCK_PACKAGE_FULL_NAME);
        expect(manifestPackage!.entryPoints).toEqual([
            'dist/index.d.ts',
            'dist/variable.d.ts',
            'dist/variable.d.ts',
            'dist/extra.d.ts'
        ]);
        expect(manifestPackage!.version).toBe('0.0.0');
        expect(engine.getPackageDirectory(MOCK_PACKAGE_FULL_NAME)).toBe(pkg.directory);
    });

    it('exposes package-level documentation and cached package lookups', () => {
        expect(pkg.packageDocumentation?.summary).toContain('Mock entities for testing documentation generation');
        expect(engine.getPackage(MOCK_PACKAGE_FULL_NAME)).toBe(pkg);
    });

    it('builds index lookups for slug, qualified name, key, and global slug', async () => {
        const node = await getNodeBySlug('mock-class');
        expect(engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-class')?.id).toBe(node.id);
        expect(engine.getNodeByQualifiedName(MOCK_PACKAGE_FULL_NAME, 'MockClass')?.id).toBe(node.id);
        expect(engine.getNodeByKey(node.key)?.id).toBe(node.id);
        expect(engine.getNodeByGlobalSlug(MOCK_PACKAGE_FULL_NAME, 'mock-class')?.id).toBe(node.id);
    });

    describe('MockClass node', () => {
        let mockClass: DocNode;

        beforeAll(async () => {
            mockClass = await getNodeBySlug('mock-class');
        });

        it('captures metadata and grouping', () => {
            expect(mockClass.kind).toBe(DocKind.Class);
            expect(mockClass.flags.isDeprecated).toBe(true);
            expect(mockClass.packageVersion).toBe('0.0.0');
            expect(mockClass.comment?.summary).toContain('Represents a complex mock class');
            expect(new Set(mockClass.groups.map((group) => group.kind))).toEqual(
                new Set([DocKind.Constructor, DocKind.Property, DocKind.Accessor, DocKind.Method])
            );
        });

        it('has optionalProp with isOptional flag set to true', () => {
            const optionalProp = mockClass.children.find((child) => child.name === '_optionalProp');
            expect(optionalProp).toBeDefined();
            expect(optionalProp?.flags.isOptional).toBe(true);
        });

        it('has optionalProp setter', () => {
            const optionalProp = mockClass.children.find((child) => child.name === 'optionalProp');
            expect(optionalProp).toBeDefined();
            expect(optionalProp?.flags.accessor).toBe('setter');
            const setter = optionalProp?.signatures.find((sig) => sig.name === 'optionalProp');
            expect(setter).toBeDefined();
            expect(setter?.kind).toBe(DocKind.SetSignature);
        });

        it('renders a get+set accessor as both signatures, with the doc + @throws carried once', () => {
            const label = mockClass.children.find((child) => child.name === 'label');
            expect(label?.kind).toBe(DocKind.Accessor);
            expect(label?.flags.accessor).toBe('getter-setter');
            // The comment moves onto the signatures, so the member summary won't render it twice.
            expect(label?.comment).toBeNull();
            expect(label?.signatures.map((sig) => sig.kind)).toEqual([DocKind.GetSignature, DocKind.SetSignature]);
            const [getter, setter] = label?.signatures ?? [];
            expect(getter?.comment?.summary).toContain('read-write accessor');
            expect(getter?.throws?.[0]?.text).toContain('Error');
            // The setter must not re-carry the shared summary.
            expect(setter?.comment).toBeNull();
        });

        it('renders a get-only accessor as a single getter signature', () => {
            const computed = mockClass.children.find((child) => child.name === 'computedProp');
            expect(computed?.flags.accessor).toBe('getter');
            expect(computed?.signatures.map((sig) => sig.kind)).toEqual([DocKind.GetSignature]);
            expect(computed?.comment).toBeNull();
            expect(computed?.signatures[0]?.comment?.summary).toContain('computed property');
        });

        it('captures type parameters and inheritance in the rendered header', () => {
            expect(mockClass.typeParameters.map((param) => param.name)).toEqual(['TypeT', 'TypeU']);
            // Constraint + heritage render through the declaration header (what apps/docs displays).
            expect(mockClass.headerText).toContain('TypeU extends number');
            expect(mockClass.headerText).toContain('extends BaseClass');

            const extendsClause = mockClass.header?.heritage?.extends?.[0];
            const baseRef = extendsClause?.parts.find((part) => part.kind === 'ref');
            expect(baseRef && 'ref' in baseRef ? baseRef.ref.name : undefined).toBe('BaseClass');
        });

        it('lists expected child nodes', () => {
            expect(mockClass.children.map((child) => child.slug)).toEqual(
                expect.arrayContaining([
                    'mock-class/constructor',
                    'mock-class/public-method',
                    'mock-class/async-method',
                    'mock-class/rest-method',
                    'mock-class/computed-prop',
                    'mock-class/optional-prop'
                ])
            );
        });

        it('maps constructor overload with parameters and throws tag', () => {
            const constructorNode = findChildNode(mockClass, 'constructor');
            expect(constructorNode.kind).toBe(DocKind.Constructor);
            const [constructorSignature] = constructorNode.signatures;
            if (!constructorSignature) {
                throw new Error('Expected constructor signature');
            }
            expect(constructorSignature.parameters.map((param) => param.name)).toEqual([
                'publicReadonlyProp',
                'protectedProp'
            ]);
            expect(constructorSignature.throws?.[0]?.text).toContain('Error');
            expect(constructorSignature.renderText).toContain('MockClass');
        });

        it('marks async method signatures with async flags', () => {
            const asyncMethod = findChildNode(mockClass, 'async-method');
            const asyncSignature = asyncMethod.signatures[0];
            if (!asyncSignature) {
                throw new Error('Expected async method signature');
            }
            expect(asyncSignature.flags.isAsync).toBe(true);
            expect(asyncSignature.render?.returnType).toBeDefined();
            expect(asyncSignature.renderText).toContain('Promise<void>');
        });

        it('identifies rest parameters in restMethod', () => {
            const restMethod = findChildNode(mockClass, 'rest-method');
            const restSignature = restMethod.signatures[0];
            if (!restSignature) {
                throw new Error('Expected rest method signature');
            }
            const restParam = restSignature.parameters.find((param) => param.name === 'rest');
            expect(restParam).toBeDefined();
            expect(restSignature.comment?.summary).toContain('rest parameters');
            expect(restParam?.comment?.summary).toContain('rest of the parameters');
        });
    });

    it('maps package-level functions with decorator and async flags', async () => {
        const logDecorator = await getNodeBySlug('log-decorator');
        expect(logDecorator.kind).toBe(DocKind.Function);
        const decoratorSignature = logDecorator.signatures[0];
        if (!decoratorSignature) {
            throw new Error('Expected LogDecorator signature');
        }
        expect(decoratorSignature.flags.isDecorator).toBe(true);
        const decoratorTagPresent =
            decoratorSignature.comment?.blockTags.some((tag) => tag.tag === '@decorator') ?? false;
        expect(decoratorTagPresent).toBe(true);
        expect(decoratorSignature.comment?.summary).toContain('A simple method decorator');

        const asyncMockFunction = await getNodeBySlug('async-mock-function');
        expect(asyncMockFunction.flags.isAsync).toBe(true);
        const asyncSignature = asyncMockFunction.signatures[0];
        if (!asyncSignature) {
            throw new Error('Expected async mock function signature');
        }
        expect(asyncSignature.flags.isAsync).toBe(true);
        expect(asyncSignature.returnsComment?.text).toContain('promise resolving');
    });

    it('extracts a {@default} param tag into the parameter defaultValue and strips it from the comment', async () => {
        const fn = await getNodeBySlug('mock-function-with-rest');
        const signature = fn.signatures[0];
        if (!signature) {
            throw new Error('Expected mockFunctionWithRest signature');
        }
        const optional = signature.parameters.find((p) => p.name === 'optional');
        expect(optional?.defaultValue).toBe("'fallback'");
        expect(optional?.comment?.summary).toBe('The optional parameter.');
    });

    it('gives each overload its own type parameters', async () => {
        // mockFunction has a generic overload `<TypeT>(param: TypeT)` and concrete `string`/`number`
        // overloads that declare no type parameters; each signature must carry only its own.
        const fn = await getNodeBySlug('mock-function');
        expect(fn.signatures.length).toBeGreaterThanOrEqual(2);
        const generic = fn.signatures.find((sig) => sig.typeParameters.length > 0);
        const concrete = fn.signatures.find((sig) => sig.typeParameters.length === 0);
        expect(generic?.typeParameters.map((tp) => tp.name)).toEqual(['TypeT']);
        expect(concrete).toBeDefined();
        // render.typeParams mirrors the per-signature list, so a concrete overload renders no `<…>`.
        expect(concrete?.render?.typeParams ?? []).toEqual([]);
    });

    it('extracts @see blocks as @see block tags (entity comment and function signature)', async () => {
        // @see parses into seeBlocks. The app's see-also renderer needs it surfaced.
        const mockClass = await getNodeBySlug('mock-class');
        const classSee = mockClass.comment?.blockTags.filter((tag) => tag.tag === '@see') ?? [];
        expect(classSee.length).toBeGreaterThan(0);

        const fn = await getNodeBySlug('mock-function');
        const signatureSee = fn.signatures.flatMap(
            (sig) => sig.comment?.blockTags.filter((tag) => tag.tag === '@see') ?? []
        );
        expect(signatureSee.length).toBeGreaterThan(0);
    });

    it('resolves a bare same-package {@link} in @see to a target reference at extraction time', async () => {
        // a bare {@link MockEnum} only resolves when the adapter passes the owning ApiItem as context;
        // without it the link carries no target and the see-also renderer falls back to plain text
        const mockClass = await getNodeBySlug('mock-class');
        const enumLink = (mockClass.comment?.blockTags ?? [])
            .filter((tag) => tag.tag === '@see')
            .flatMap((tag) => tag.content)
            .find((part) => part.kind === 'inline-tag' && part.tag === '@link' && part.text === 'MockEnum');
        expect(enumLink).toBeDefined();
        const target = enumLink?.kind === 'inline-tag' ? enumLink.target : undefined;
        const targetKey = typeof target === 'object' ? target.targetKey : undefined;
        expect(targetKey).toContain('MockEnum');
    });

    it('maps type aliases and enum members correctly', async () => {
        const unionType = await getNodeBySlug('mock-union');
        expect(unionType.kind).toBe(DocKind.TypeAlias);
        expect(unionType.headerText).toContain('type MockUnion');
        expect(unionType.headerText).toContain('= string | number | boolean');

        const enumNode = await getNodeBySlug('mock-enum');
        expect(enumNode.kind).toBe(DocKind.Enum);
        const secondMember = enumNode.children.find((child) => child.name === 'Second');
        const thirdMember = enumNode.children.find((child) => child.name === 'Third');
        expect(secondMember?.defaultValue).toBe('10');
        expect(thirdMember?.defaultValue).toBe('"third"');
    });

    it('resolves references using keys, package hints, and external URLs', async () => {
        // DocsEngine is the eager NodeLookup; pair it with a registry over its loaded packages. The
        // eager engine resolves every ref through loaded nodes, so the index-driven cross-package gate
        // is never reached here.
        const registry: PackageRegistry = {
            isKnownPackage: (name) => engine.getPackage(name) !== null,
            candidatePackages: (current, hinted) => orderedPackageCandidates(current, hinted, engine.listPackages()),
            crossPackageEntity: () => null
        };
        const resolver = new ReferenceResolver(engine, registry, new AnchorStrategy(engine));
        const target = await getNodeBySlug('mock-function');

        expect(resolver.resolve(MOCK_PACKAGE_FULL_NAME, { name: target.name, targetKey: target.key })).toEqual({
            kind: 'internal',
            packageName: MOCK_PACKAGE_FULL_NAME,
            slug: 'mock-function'
        });

        expect(
            resolver.resolve(MOCK_PACKAGE_FULL_NAME, { name: 'publicMethod', qualifiedName: 'MockClass.publicMethod' })
        ).toEqual({ kind: 'internal', packageName: MOCK_PACKAGE_FULL_NAME, slug: 'mock-class/public-method' });

        expect(
            resolver.resolve(MOCK_PACKAGE_FULL_NAME, { name: 'MockEnum', packageName: MOCK_PACKAGE_FULL_NAME })
        ).toEqual({ kind: 'internal', packageName: MOCK_PACKAGE_FULL_NAME, slug: 'mock-enum' });

        expect(resolver.resolve(MOCK_PACKAGE_FULL_NAME, { name: 'MockClass.publicMethod' })).toEqual({
            kind: 'internal',
            packageName: MOCK_PACKAGE_FULL_NAME,
            slug: 'mock-class/public-method'
        });

        expect(
            resolver.resolve(MOCK_PACKAGE_FULL_NAME, { name: 'MDN', externalUrl: 'https://developer.mozilla.org/' })
        ).toEqual({ kind: 'external', url: 'https://developer.mozilla.org/' });

        expect(resolver.resolve(MOCK_PACKAGE_FULL_NAME, { name: 'NonExistentSymbol' })).toEqual({ kind: 'unresolved' });
    });
});
