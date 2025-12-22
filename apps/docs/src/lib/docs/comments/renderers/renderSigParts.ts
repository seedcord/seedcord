import { resolveExternalPackageUrl } from '../../packages';
import { resolveReferenceHref } from '../../resolveReferenceHref';
import { SPACE } from '../constants';
import { resolveOptions } from '../resolvers';

import type { FormatContext } from '../../types';
import type { SigPart } from '@seedcord/docs-engine';

export function renderSigParts(parts: SigPart[], context: FormatContext): string {
    let result = '';

    for (const part of parts) {
        switch (part.kind) {
            case 'space':
                if (!result.endsWith(SPACE) && result.length > 0) {
                    result += SPACE;
                }
                break;
            case 'ref': {
                const href = resolveReferenceHref(part.ref, resolveOptions(context));
                if (href) {
                    result += `[${part.text}](${href})`;
                } else {
                    const external = resolveExternalPackageUrl(part.text);
                    if (external) {
                        result += `[${part.text}](${external})`;
                    } else {
                        result += part.text;
                    }
                }
                break;
            }
            default: {
                const external = resolveExternalPackageUrl(part.text);
                if (external) {
                    result += `[${part.text}](${external})`;
                } else {
                    result += part.text;
                }
                break;
            }
        }
    }

    return result;
}
