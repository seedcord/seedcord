import * as Twoslash from 'fumadocs-twoslash/ui';
import defaultMdxComponents from 'fumadocs-ui/mdx';

import type { MDXComponents } from 'mdx/types';

export const mdxComponents: MDXComponents = { ...defaultMdxComponents, ...Twoslash };
