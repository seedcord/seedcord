'use client';

import { cn } from '@seedcord/ui';
import { useEffect, type ReactElement } from 'react';

import { log } from '@lib/logger';

import { EntityHeader } from './EntityHeader';
import { renderEntityBody } from './utils/renderers/renderEntityBody';
import { useEntityTone } from './utils/useEntityTone';

import type { EntityModel, FunctionEntityModel } from '@lib/docs/types';

interface EntityContentProps {
    model: EntityModel;
}

export function EntityContent({ model }: EntityContentProps): ReactElement {
    const { tone, badgeLabel } = useEntityTone(model.kind);

    useEffect(() => {
        log('Entity page mounted', {
            symbolName: model.name,
            kind: model.kind,
            pkg: model.displayPackage,
            tone
        });
    }, [model.name, model.kind, model.displayPackage, tone]);

    const body = renderEntityBody(model);
    let functionSignatures: FunctionEntityModel['signatures'] | undefined = undefined;
    if (model.kind === 'function') {
        functionSignatures = model.signatures;
    }

    return (
        <article className={cn('w-full min-w-0 space-y-6 lg:space-y-8')}>
            <EntityHeader
                badgeLabel={badgeLabel}
                pkg={model.displayPackage}
                signature={model.signature}
                summary={model.summary}
                summaryExamples={model.summaryExamples}
                symbolName={model.name}
                tone={tone}
                sourceUrl={model.sourceUrl ?? null}
                tags={model.tags ?? []}
                seeAlso={model.seeAlso}
                throws={model.throws}
                {...(model.version ? { version: model.version } : {})}
                deprecationStatus={model.deprecationStatus}
                {...(functionSignatures ? { functionSignatures } : {})}
            />
            {body ?? null}
        </article>
    );
}
