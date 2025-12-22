import { AlertTriangle } from 'lucide-react';

import Icon from '@ui/Icon';

import CommentParagraphs from './comments/CommentParagraphs';

import type { WithDeprecationStatus } from '@lib/docs/types';
import type { ReactElement, ReactNode } from 'react';

interface DeprecatedEntityProps extends WithDeprecationStatus {
    children: ReactNode;
}

function DeprecatedEntity({
    deprecationStatus = { isDeprecated: false },
    children
}: DeprecatedEntityProps): ReactElement {
    if (!deprecationStatus.isDeprecated) return <>{children}</>;

    return (
        <div className="relative">
            <div className="deprecated-card shadow-soft p-4 sm:p-5">
                {deprecationStatus.deprecationMessage ? (
                    <div className="text-subtle mb-3 flex items-start gap-3 text-sm">
                        <div className="mt-0.5 shrink-0 text-(--deprecated-dark)">
                            <Icon icon={AlertTriangle} size={16} />
                        </div>
                        <div className="text-subtle min-w-0 text-sm leading-relaxed">
                            <CommentParagraphs paragraphs={deprecationStatus.deprecationMessage} />
                        </div>
                    </div>
                ) : null}

                {children}
            </div>
            <span className="deprecated-label">Deprecated</span>
        </div>
    );
}

export default DeprecatedEntity;
