import type { ComponentType, ReactNode } from 'react';

export type NavLinkComponent = ComponentType<{
    href: string;
    className?: string;
    children?: ReactNode;
    'aria-current'?: 'page' | undefined;
}>;

export const PlainLink: NavLinkComponent = ({ href, ...rest }) => <a href={href} {...rest} />;
