import type {
    ClassLikeEntityModel,
    CodeRepresentation,
    CommentExample,
    CommentParagraph,
    EntityMemberSummary,
    EntityModel,
    EnumEntityModel,
    FunctionEntityModel,
    TypeEntityModel
} from './types';

// function and type render their own declaration (per-signature / the expanded declaration), so the
// base signature would just duplicate it.
const SKIP_BASE_SIGNATURE = new Set<EntityModel['kind']>(['function', 'type']);

function paragraphs(parts: readonly CommentParagraph[] | undefined): string {
    if (!parts?.length) return '';
    return parts.map((part) => part.plain).join('\n\n');
}

function inline(parts: readonly CommentParagraph[] | undefined): string {
    return paragraphs(parts).replace(/\s+/g, ' ').trim();
}

function fence(code: CodeRepresentation | undefined): string {
    const text = code?.text.trim();
    return text ? `\`\`\`ts\n${text}\n\`\`\`` : '';
}

function examples(list: readonly CommentExample[] | undefined): string[] {
    if (!list?.length) return [];
    const blocks = list.map((example) => {
        const caption = example.caption ? `_${example.caption}_\n\n` : '';
        return caption + fence(example.code);
    });
    return ['## Examples', '', blocks.join('\n\n'), ''];
}

function memberBlock(member: EntityMemberSummary): string {
    const out: string[] = [`### ${member.label}`, ''];
    for (const signature of member.signatures) {
        const code = fence(signature.code);
        if (code) out.push(code, '');
    }
    const doc = member.description?.plain ?? paragraphs(member.sharedDocumentation);
    if (doc) out.push(doc, '');
    return out.join('\n');
}

function memberGroup(title: string, members: readonly EntityMemberSummary[] | undefined): string[] {
    if (!members?.length) return [];
    return [`## ${title}`, '', members.map(memberBlock).join('\n'), ''];
}

function classLikeSections(entity: ClassLikeEntityModel): string[] {
    return [
        ...memberGroup('Constructors', entity.constructors),
        ...memberGroup('Properties', entity.properties),
        ...memberGroup('Methods', entity.methods)
    ];
}

function enumSection(entity: EnumEntityModel): string[] {
    if (!entity.members.length) return [];
    const rows = entity.members.map((member) => {
        const signature = member.signature.text ? ` \`${member.signature.text}\`` : '';
        const summary = inline(member.summary);
        return `- **${member.label}**${signature}${summary ? ` — ${summary}` : ''}`;
    });
    return ['## Members', '', rows.join('\n'), ''];
}

function functionSections(entity: FunctionEntityModel): string[] {
    const out: string[] = [];
    const numbered = entity.signatures.length > 1;
    entity.signatures.forEach((signature, index) => {
        if (numbered) out.push(`## Signature ${String(index + 1)}`, '');
        const code = fence(signature.code);
        if (code) out.push(code, '');
        const summary = paragraphs(signature.summary);
        if (summary) out.push(summary, '');
        if (signature.parameters.length) {
            out.push('Parameters.', '');
            for (const parameter of signature.parameters) {
                const optional = parameter.optional ? '?' : '';
                const type = parameter.type ? ` \`${parameter.type}\`` : '';
                const doc = inline(parameter.documentation);
                out.push(`- \`${parameter.name}${optional}\`${type}${doc ? ` — ${doc}` : ''}`);
            }
            out.push('');
        }
        if (signature.returnType) out.push(`Returns \`${signature.returnType}\`.`, '');
    });
    return out;
}

function typeSection(entity: TypeEntityModel): string[] {
    const declaration = fence(entity.declaration);
    return declaration ? ['## Declaration', '', declaration, ''] : [];
}

function references(entity: EntityModel): string[] {
    const out: string[] = [];
    if (entity.throws?.length) out.push('## Throws', '', paragraphs(entity.throws), '');
    if (entity.seeAlso?.length) {
        const items = entity.seeAlso.map((entry) =>
            entry.href ? `- [${entry.name}](${entry.href})` : `- ${entry.name}`
        );
        out.push('## See also', '', items.join('\n'), '');
    }
    return out;
}

/**
 * Render an API entity as agent-friendly Markdown
 */
export function entityToMarkdown(entity: EntityModel, selfUrl?: string): string {
    const version = entity.version ? ` · v${entity.version}` : '';
    const lines: string[] = [
        `# ${entity.name}`,
        '',
        `\`${entity.kind}\` in \`${entity.displayPackage}\`${version}`,
        ''
    ];

    if (selfUrl) lines.push(`<${selfUrl}>`, '');

    if (entity.deprecationStatus?.isDeprecated) {
        const message = inline(entity.deprecationStatus.deprecationMessage);
        lines.push(`> **Deprecated.**${message ? ` ${message}` : ''}`, '');
    }

    const summary = paragraphs(entity.summary);
    if (summary) lines.push(summary, '');

    if (!SKIP_BASE_SIGNATURE.has(entity.kind)) {
        const signature = fence(entity.signature);
        if (signature) lines.push(signature, '');
    }

    lines.push(...examples(entity.summaryExamples));

    switch (entity.kind) {
        case 'class':
        case 'interface':
            lines.push(...classLikeSections(entity));
            break;
        case 'enum':
            lines.push(...enumSection(entity));
            break;
        case 'function':
            lines.push(...functionSections(entity));
            break;
        case 'type':
            lines.push(...typeSection(entity));
            break;
        case 'variable':
        default:
            break;
    }

    lines.push(...references(entity));

    return `${lines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()}\n`;
}
