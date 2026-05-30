import { CodeBlock } from '@seedcord/ui';

import type { CodeRepresentation } from '@lib/docs/types';
import type { ReactElement } from 'react';

export function SignatureBlock({ signature }: { signature: CodeRepresentation }): ReactElement {
    return <CodeBlock representation={signature} copyValue={null} />;
}
