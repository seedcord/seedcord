import { Icon, cn } from '@seedcord/ui';
import { AlertTriangle } from 'lucide-react';

import { CommentParagraphs } from './comments/CommentParagraphs';

import type { WithDeprecationStatus } from '@lib/docs/types';
import type { ReactElement, ReactNode } from 'react';

interface DeprecatedEntityProps extends WithDeprecationStatus {
    children: ReactNode;
}

export function DeprecatedEntity({
    deprecationStatus = { isDeprecated: false },
    children
}: DeprecatedEntityProps): ReactElement {
    if (!deprecationStatus.isDeprecated) return <>{children}</>;

    return (
        <div className={cn('relative')}>
            <div className={cn('deprecated-card shadow-soft p-4 sm:p-5')}>
                {deprecationStatus.deprecationMessage ? (
                    <div className={cn('text-subtle mb-3 flex items-start gap-3 text-sm')}>
                        <div className={cn('mt-0.5 shrink-0 text-(--deprecated-dark)')}>
                            <Icon icon={AlertTriangle} size={16} />
                        </div>
                        <div className={cn('text-subtle min-w-0 text-sm/relaxed')}>
                            <CommentParagraphs paragraphs={deprecationStatus.deprecationMessage} />
                        </div>
                    </div>
                ) : null}

                {children}
            </div>
            <span className={cn('deprecated-label')}>Deprecated</span>
        </div>
    );
}
