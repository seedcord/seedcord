import type { CodeRepresentation } from '@lib/docs/types';
import type { ReactElement } from 'react';

function SignatureBlock({ signature }: { signature: CodeRepresentation }): ReactElement {
    const containerClassName =
        'code-scroll-area card bg-surface-96 px-2.5 py-2 text-sm text-(--text) shadow-soft md:px-3 md:py-2.5';

    if (signature.html) {
        return (
            <div className={containerClassName}>
                <div className="code-scroll-content" dangerouslySetInnerHTML={{ __html: signature.html }} />
            </div>
        );
    }

    return (
        <div className={containerClassName}>
            <pre className="code-scroll-content text-sm whitespace-pre-wrap text-(--text)">
                <code>{signature.text}</code>
            </pre>
        </div>
    );
}

export default SignatureBlock;
