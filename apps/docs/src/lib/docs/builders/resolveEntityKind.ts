import { kindName } from '@seedcord/docs-engine';

import { resolveEntityTone } from '@lib/entityMetadata';

import type { EntityKind } from '../types';
import type { DocNode } from '@seedcord/docs-engine';

export function resolveEntityKind(node: DocNode): EntityKind {
    return resolveEntityTone(kindName(node.kind));
}
