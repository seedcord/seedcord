import { renderDefaultValue } from './renderers/renderDefaultValue';
import { renderDeprecation } from './renderers/renderDeprecation';
import { renderExamples } from './renderers/renderExamples';
import { renderParagraphs } from './renderers/renderParagraphs';
import { renderSeeAlso } from './renderers/renderSeeAlso';
import { renderThrows } from './renderers/renderThrows';

import type { FormatContext, FormattedComment } from '#lib/docs/types';
import type { DocComment } from '@seedcord/docs-engine';

export async function formatCommentRich(
    comment: DocComment | null | undefined,
    context: FormatContext
): Promise<FormattedComment> {
    if (!comment) {
        return { paragraphs: [], examples: [] } satisfies FormattedComment;
    }

    const [paragraphs, examples, seeAlso, throws, defaultValue, deprecation] = await Promise.all([
        renderParagraphs(comment, context),
        renderExamples(comment),
        Promise.resolve(renderSeeAlso(comment, context)),
        renderThrows(comment, context),
        renderDefaultValue(comment, context),
        renderDeprecation(comment, context)
    ]);

    return {
        paragraphs,
        examples,
        seeAlso: seeAlso ?? [],
        throws: throws ?? [],
        defaultValue: defaultValue ?? [],
        deprecation
    } satisfies FormattedComment;
}
