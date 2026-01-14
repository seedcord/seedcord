import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect } from 'vitest';

import type { JSONOutput } from 'typedoc';

/**
 * Read the generated JSON documentation file
 */
export function readGeneratedDoc(tempDir: string, packageName: string): JSONOutput.ProjectReflection {
    const filePath = resolve(tempDir, `${packageName}.json`);
    if (!existsSync(filePath)) {
        throw new Error(`Generated documentation file not found: ${filePath}`);
    }
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as JSONOutput.ProjectReflection;
}

/**
 * Find a child reflection by name in a container
 */
export function findChild(
    parent: JSONOutput.ContainerReflection,
    name: string
): JSONOutput.DeclarationReflection | undefined {
    return parent.children?.find((c) => c.name === name);
}

/**
 * Get comment summary text
 */
export function getSummaryText(comment?: JSONOutput.Comment): string | undefined {
    return comment?.summary
        .map((s) => s.text)
        .join('')
        .trim();
}

/**
 * Find a block tag in a comment
 */
export function getBlockTag(
    comment: JSONOutput.Comment | undefined,
    tagName: string
): JSONOutput.CommentTag | undefined {
    return comment?.blockTags?.find((t) => t.tag === tagName);
}

/**
 * Check if a reflection has a specific flag
 */
export function hasFlag(reflection: JSONOutput.DeclarationReflection, flag: keyof JSONOutput.ReflectionFlags): boolean {
    return reflection.flags[flag] === true;
}

/**
 * Check comment summary
 */
export function checkCommentSummary(
    reflection: JSONOutput.DeclarationReflection | JSONOutput.SignatureReflection,
    expected: string
): void {
    expect(getSummaryText(reflection.comment)).toBe(expected);
}

/**
 * Check block tag presence and content
 */
export function checkBlockTag(
    reflection: JSONOutput.DeclarationReflection | JSONOutput.SignatureReflection,
    tag: string,
    contentContains?: string
): void {
    const blockTag = getBlockTag(reflection.comment, tag);
    expect(blockTag).toBeDefined();
    if (contentContains) {
        const text = blockTag?.content.map((c) => c.text).join('');
        expect(text).toContain(contentContains);
    }
}

/**
 * Check type
 */
export function checkType(reflection: JSONOutput.DeclarationReflection, expectedType: string): void {
    expect(reflection.type?.type).toBe(expectedType);
}

/**
 * Check sources
 */
export function checkSources(reflection: JSONOutput.DeclarationReflection, file: string, line: number): void {
    expect(reflection.sources?.[0]?.fileName).toBe(file);
    expect(reflection.sources?.[0]?.line).toBe(line);
}

/**
 * Check if sources exist and are valid
 */
export function checkHasSources(reflection: JSONOutput.DeclarationReflection): void {
    expect(reflection.sources).toBeDefined();
    expect(reflection.sources?.length).toBeGreaterThan(0);
    const source = reflection.sources?.[0];
    expect(source?.fileName).toBeDefined();
    expect(source?.line).toBeGreaterThan(0);
}

/**
 * Check modifier tags
 */
export function checkModifierTag(
    reflection: JSONOutput.DeclarationReflection | JSONOutput.SignatureReflection,
    tag: string
): void {
    const hasModifier = reflection.comment?.modifierTags?.includes(tag as `@${string}`);
    const hasBlock = getBlockTag(reflection.comment, tag);
    expect(hasModifier || hasBlock ? true : false).toBe(true);
}

/**
 * Check default value
 */
export function checkDefaultValue(reflection: JSONOutput.DeclarationReflection, expectedValue: string): void {
    expect(reflection.defaultValue).toBe(expectedValue);
}

/**
 * Check groups structure
 */
export function checkGroups(parent: JSONOutput.ContainerReflection, expectedGroups: string[]): void {
    expect(parent.groups).toBeDefined();
    expect(parent.groups?.length).toBe(expectedGroups.length);

    for (const expectedGroup of expectedGroups) {
        const group = parent.groups?.find((g) => g.title === expectedGroup);
        expect(group).toBeDefined();
        expect(group?.children?.length).toBeGreaterThan(0);
    }
}

/**
 * Check type parameters
 */
export function checkTypeParameters(reflection: JSONOutput.DeclarationReflection, expectedParams: string[]): void {
    expect(reflection.typeParameters).toBeDefined();
    expect(reflection.typeParameters?.length).toBe(expectedParams.length);

    for (let i = 0; i < expectedParams.length; i++) {
        expect(reflection.typeParameters?.[i]?.name).toBe(expectedParams[i]);
    }
}

/**
 * Check signature parameters
 */
export function checkSignatureParameters(
    signature: JSONOutput.SignatureReflection,
    expectedParams: { name: string; optional?: boolean; rest?: boolean }[]
): void {
    expect(signature.parameters).toBeDefined();
    expect(signature.parameters?.length).toBe(expectedParams.length);

    for (let i = 0; i < expectedParams.length; i++) {
        const param = signature.parameters?.[i];
        const expected = expectedParams[i];
        if (!expected || !param) continue;

        expect(param.name).toBe(expected.name);
        if (expected.optional) {
            expect(param.flags.isOptional).toBe(true);
        }
        if (expected.rest) {
            expect(param.flags.isRest).toBe(true);
        }
    }
}

/**
 * Check inheritance
 */
export function checkInheritance(
    reflection: JSONOutput.DeclarationReflection,
    expectedExtends?: string[],
    expectedExtendedBy?: string[]
): void {
    if (expectedExtends) {
        expect(reflection.extendedTypes).toBeDefined();
        expect(reflection.extendedTypes?.length).toBe(expectedExtends.length);
    }

    if (expectedExtendedBy) {
        expect(reflection.extendedBy).toBeDefined();
        expect(reflection.extendedBy?.length).toBe(expectedExtendedBy.length);
    }
}

/**
 * Check if reflection has inherited flag
 */
export function checkInherited(reflection: JSONOutput.DeclarationReflection, expected = true): void {
    expect(hasFlag(reflection, 'isInherited')).toBe(expected);
}

/**
 * Get text content from comment content array
 */
export function getCommentText(content: JSONOutput.CommentDisplayPart[]): string {
    return content.map((part) => part.text).join('');
}
