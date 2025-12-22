import { renderSigParts } from './renderSigParts';

import type { FormatContext } from '../../types';
import type { InlineType } from '@seedcord/docs-engine';

export function renderInlineType(type: InlineType | undefined, context: FormatContext): string {
    if (!type) {
        return '';
    }

    return renderSigParts(type.parts, context);
}
