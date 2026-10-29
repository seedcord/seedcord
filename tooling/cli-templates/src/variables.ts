import { dirname } from 'node:path';

import { posixRelative } from '@seedcord/utils/internal';

import type { FilledName } from './helperNames';
import type { RenderProject } from './TemplateOutput';
import type { Runtime } from '@seedcord/core/internal';
import type { TransportPackage } from '@seedcord/types/internal';
import type { JsonValue } from 'type-fest';

export interface TransportVariables {
    readonly transport: TransportPackage;
    readonly isGateway: boolean;
    readonly isEdge: boolean;
}

export function transportVariables(transport: TransportPackage, runtime: Runtime): TransportVariables {
    return { transport, isGateway: transport === '@seedcord/gateway', isEdge: runtime === 'edge' };
}

export function cliVariables(project: RenderProject, path: string): Record<Exclude<FilledName, 'name'>, JsonValue> {
    return {
        ...transportVariables(project.transport, project.runtime),
        toRoot: posixRelative(dirname(path), project.root) || '.'
    };
}
