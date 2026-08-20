import type { ComponentType, MouseEventHandler, ReactNode } from 'react';

export type NavLinkComponent = ComponentType<{
    href: string;
    className?: string;
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
    'aria-current'?: 'page' | undefined;
}>;

export const PlainLink: NavLinkComponent = ({ href, ...rest }) => <a href={href} {...rest} />;
