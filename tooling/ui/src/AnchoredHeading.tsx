import { CopyAnchorButton } from './CopyAnchorButton';
import { cn } from './lib/cn';

import type { ComponentProps, ReactElement } from 'react';

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
                    className={anchorClassName}
                />
            )}
        </div>
    );
}
