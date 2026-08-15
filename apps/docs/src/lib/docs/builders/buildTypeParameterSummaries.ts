import { typeParamFragment } from '@seedcord/docs-engine';

import { createPlainParagraph } from '#lib/docs/comments/creators';
import { formatCommentRich } from '#lib/docs/comments/formatter';
import { formatTypeParameter } from '#lib/docs/formatting';

import type { FormatContext, CommentParagraph, CommentExample, EntityMemberSummary } from '#lib/docs/types';
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
            const code = await formatTypeParameter(param, context);
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

            const fragment = typeParamFragment(param.name);

            return {
                id: fragment,
                label: param.name,
                description,
                sharedDocumentation: [],
                sharedExamples: examples,
                signatures: [
                    {
                        id: fragment,
                        anchor: '',
                        code,
                        documentation,
                        examples
                    }
                ]
            } satisfies EntityMemberSummary;
        })
    );
}
