import type { SearchAction } from '@seedcord/docs-search';

export interface CommandAction extends SearchAction {
    isExternal?: boolean;
}

export interface DocsPackageOption {
    folder: string;
    label: string;
}
