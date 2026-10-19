import { CopyAnchorButton } from './CopyAnchorButton';
import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ComponentProps, ReactElement } from 'react';

export const ANCHOR_REVEAL = tw`shrink-0 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-has-focus-visible:opacity-100 md:data-[copied=true]:opacity-100`;

interface AnchoredHeadingProps extends ComponentProps<'h2'> {
    as: 'h2' | 'h3' | 'h4';
    wrapperClassName: string;
    anchorSize: number;
    anchorClassName: string;
}

// a labelled control inside a heading becomes part of the heading's accessible name
export function AnchoredHeading({
    as: Tag,
    id,
    className,
    children,
    wrapperClassName,
    anchorSize,
    anchorClassName,
    ...props
}: AnchoredHeadingProps): ReactElement {
    return (
        <div className={cn('group', wrapperClassName)}>
            <Tag {...props} id={id} className={className}>
                {children}
            </Tag>
            {id === undefined ? null : (
                <CopyAnchorButton
                    anchorId={id}
                    label={typeof children === 'string' ? children : id}
                    iconSize={anchorSize}
                    className={cn(ANCHOR_REVEAL, anchorClassName)}
                />
            )}
        </div>
    );
}
