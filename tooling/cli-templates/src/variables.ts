import { dirname } from 'node:path';

import { posixRelative } from '@seedcord/utils/internal';
import { mapValues } from 'es-toolkit';

import type { RenderProject } from './TemplateOutput';
import type { JsonObject, JsonValue } from 'type-fest';

interface OutputFile {
    readonly project: RenderProject;
    readonly path: string;
}

const CLI_VARIABLES = {
    transport: ({ project }: OutputFile) => `@seedcord/${project.transport}`,
    isGateway: ({ project }: OutputFile) => project.transport === 'gateway',
    isEdge: ({ project }: OutputFile) => project.runtime === 'edge',
    toRoot: ({ project, path }: OutputFile) => posixRelative(dirname(path), project.root) || '.'
} satisfies Record<string, (file: OutputFile) => JsonValue>;

export function cliVariables(file: OutputFile): JsonObject {
    return mapValues(CLI_VARIABLES, (read) => read(file));
}
