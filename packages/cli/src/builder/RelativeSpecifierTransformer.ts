import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import ts from 'typescript';

interface SpecifierReplacement {
    start: number;
    end: number;
    text: string;
}

export class RelativeSpecifierTransformer {
    public async transform(outDir: string): Promise<void> {
        const files = await this.collectJavaScriptFiles(outDir);
        for (const filePath of files) {
            await this.rewriteFile(filePath);
        }
    }

    private async collectJavaScriptFiles(rootDir: string): Promise<string[]> {
        const pending = [rootDir];
        const files: string[] = [];

        while (pending.length) {
            const current = pending.pop();
            if (!current) continue;

            const entries = await readdir(current, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = resolve(current, entry.name);
                if (entry.isDirectory()) pending.push(fullPath);
                else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
            }
        }

        return files;
    }

    private async rewriteFile(filePath: string): Promise<void> {
        const source = await readFile(filePath, 'utf8');
        const replacements = this.extractSpecifierReplacements(source);
        if (!replacements.length) return;

        let mutated = source;
        for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
            mutated = `${mutated.slice(0, replacement.start)}${replacement.text}${mutated.slice(replacement.end)}`;
        }

        await writeFile(filePath, mutated, 'utf8');
    }

    private extractSpecifierReplacements(sourceText: string): SpecifierReplacement[] {
        const sourceFile = ts.createSourceFile(
            'generated.js',
            sourceText,
            ts.ScriptTarget.ES2022,
            true,
            ts.ScriptKind.JS
        );
        const replacements: SpecifierReplacement[] = [];

        const visit = (node: ts.Node): void => {
            if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
                this.scheduleReplacement(sourceFile, node.moduleSpecifier, replacements);
            } else if (
                ts.isExportDeclaration(node) &&
                node.moduleSpecifier &&
                ts.isStringLiteralLike(node.moduleSpecifier)
            ) {
                this.scheduleReplacement(sourceFile, node.moduleSpecifier, replacements);
            } else if (
                ts.isCallExpression(node) &&
                node.expression.kind === ts.SyntaxKind.ImportKeyword &&
                node.arguments.length === 1
            ) {
                const [arg] = node.arguments;
                if (arg && ts.isStringLiteralLike(arg)) {
                    this.scheduleReplacement(sourceFile, arg, replacements);
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return replacements;
    }

    private scheduleReplacement(
        sourceFile: ts.SourceFile,
        literal: ts.StringLiteralLike,
        replacements: SpecifierReplacement[]
    ): void {
        const updated = this.appendJsExtension(literal.text);
        if (updated === literal.text) return;

        const literalText = literal.getText(sourceFile);
        const quote = literalText.startsWith('`') ? '`' : literalText.startsWith("'") ? "'" : '"';
        replacements.push({
            start: literal.getStart(sourceFile),
            end: literal.getEnd(),
            text: `${quote}${updated}${quote}`
        });
    }

    private appendJsExtension(specifier: string): string {
        if (!specifier.startsWith('./') && !specifier.startsWith('../')) return specifier;
        if (/\.(?:[cm]?js|json)$/i.test(specifier)) return specifier;
        return `${specifier}.js`;
    }
}
