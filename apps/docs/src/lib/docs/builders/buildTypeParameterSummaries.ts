import { createPlainParagraph } from '../comments/creators';
import { formatCommentRich } from '../comments/formatter';
import { renderInlineType } from '../comments/renderers/renderInlineType';
import { highlightCode } from '../formatting';

import type { FormatContext, CommentParagraph, CommentExample } from '../types';
import type { EntityMemberSummary } from '@components/docs/entity/types';
import type { RenderedDeclarationHeader, DocTypeParameter } from '@seedcord/docs-engine';

export async function buildTypeParameterSummaries(
    header: RenderedDeclarationHeader | undefined,
    context: FormatContext,
    docTypeParams?: DocTypeParameter[]
): Promise<EntityMemberSummary[]> {
    const params = header?.typeParams ?? [];
    if (!params.length) {
        return [];
    }

    return Promise.all(
        params.map(async (param) => {
            const segments: string[] = [param.name];

            if (param.constraint) {
                segments.push(`extends ${renderInlineType(param.constraint, context)}`);
            }

            if (param.default) {
                segments.push(`= ${renderInlineType(param.default, context)}`);
            }

            const code = await highlightCode(segments.join(' '));
            const documentation: CommentParagraph[] = [];
            const examples: CommentExample[] = [];

            const docParam = docTypeParams ? docTypeParams.find((d) => d.name === param.name) : undefined;
            let description: CommentParagraph = createPlainParagraph('');
            if (docParam?.comment) {
                const formatted = await formatCommentRich(docParam.comment, context);
                if (formatted.paragraphs.length) {
                    description = formatted.paragraphs[0] ?? createPlainParagraph('');
                    if (formatted.paragraphs.length > 1) {
                        documentation.push(...formatted.paragraphs.slice(1));
                    }
                }
                if (formatted.examples.length) {
                    examples.push(...formatted.examples);
                }
            }

            return {
                id: `type-${param.name}`,
                label: param.name,
                description,
                sharedDocumentation: documentation,
                sharedExamples: examples,
                signatures: [
                    {
                        id: `type-${param.name}-signature`,
                        anchor: `type-${param.name}`,
                        code,
                        documentation,
                        examples
                    }
                ]
            } satisfies EntityMemberSummary;
        })
    );
}
