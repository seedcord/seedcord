import { Badge, Icon, cn } from '@seedcord/ui';
import { AlertTriangle } from 'lucide-react';

import { CommentParagraphs } from './comments/CommentParagraphs';

import type { WithDeprecationStatus } from '#lib/docs/types';
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
                    <div className={cn('text-subtle mb-3 min-w-0 text-sm/relaxed')}>
                        <CommentParagraphs paragraphs={deprecationStatus.deprecationMessage} />
                    </div>
                ) : null}

                {children}
            </div>
            {/* left tracks the card padding so the label and the text share one edge */}
            <Badge
                className={cn(
                    'absolute -top-2 left-4 z-3 border-(--deprecated-dark) bg-(--deprecated-dark) text-white sm:left-5'
                )}
            >
                <Icon icon={AlertTriangle} size={12} />
                Deprecated
            </Badge>
        </div>
    );
}
