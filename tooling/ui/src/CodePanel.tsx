import { Card, CardBody, CardDescription, CardHeader, CardTitle } from './Card';
import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { CodeRepresentation } from './types/CodeRepresentation';
import type { ReactElement } from 'react';

export interface CodePanelProps {
    representation: CodeRepresentation;
    title?: string;
    description?: string;
    className?: string;
}

const CODE_CONTAINER_CLASS = tw`code-scroll-area rounded-md border border-(--border) bg-(--surface-subtle) px-3 py-2 text-sm text-(--text)`;

export function CodePanel({ representation, title, description, className }: CodePanelProps): ReactElement {
    const hasHeader = Boolean(title ?? description);
    return (
        <Card as="section" variant="default" size="md" className={cn(className)}>
            <CardBody>
                {hasHeader ? (
                    <CardHeader>
                        {title ? <CardTitle>{title}</CardTitle> : null}
                        {description ? <CardDescription>{description}</CardDescription> : null}
                    </CardHeader>
                ) : null}
                {representation.html ? (
                    <div className={cn(CODE_CONTAINER_CLASS)}>
                        <div
                            className={cn('code-scroll-content')}
                            dangerouslySetInnerHTML={{ __html: representation.html }}
                        />
                    </div>
                ) : (
                    <div className={cn(CODE_CONTAINER_CLASS)}>
                        <pre className={cn('code-scroll-content leading-relaxed whitespace-pre')}>
                            <code>{representation.text}</code>
                        </pre>
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
