import { basename } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import ownPackage from '#package' with { type: 'json' };

import { runPrefix } from '#cli/packageManager';
import { intentsFor, partialsFor } from '#interview/capabilities';

import type { Answers } from '#interview/types';
import type { AgentName } from 'package-manager-detector';

const REQUIRED = ['directory', 'transport', 'token', 'testingGuilds', 'botColor', 'install', 'git'] as const;

// runFlow leaves capabilities unset on http and runtime unset on gateway
export type ScaffoldAnswers = Partial<Answers> & Pick<Answers, (typeof REQUIRED)[number]>;

// the three that make messageCreate fire
const MESSAGE_CAPABILITIES = new Set(['guild-messages', 'message-text', 'direct-messages']);

export interface TemplateContext {
    projectName: string;
    isGateway: boolean;
    isEdge: boolean;
    transportPackage: string;
    intents: string[];
    partials: string[];
    hasMessages: boolean;
    token: string;
    testingGuildIds: string;
    botColor: string;
    developerUsername: string;
    pm: { run: string; isBun: boolean; isPnpm: boolean };
    engines: { node: string; bun: string };
}

// runFlow either fills these or throws
export function requireScaffoldAnswers(answers: Partial<Answers>): ScaffoldAnswers {
    for (const key of REQUIRED) {
        if (answers[key] === undefined) {
            throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [key, 'No answer was collected.']);
        }
    }

    return answers as ScaffoldAnswers;
}

export function buildContext(
    answers: ScaffoldAnswers,
    extras: { developerUsername: string; agent: AgentName }
): TemplateContext {
    const isGateway = answers.transport === 'gateway';
    const capabilities = isGateway ? (answers.capabilities ?? []) : [];

    return {
        projectName: basename(answers.directory),
        isGateway,
        isEdge: answers.runtime === 'edge',
        transportPackage: isGateway ? '@seedcord/gateway' : '@seedcord/http',
        intents: isGateway ? intentsFor(capabilities) : [],
        partials: isGateway ? partialsFor(capabilities) : [],
        hasMessages: capabilities.some((id) => MESSAGE_CAPABILITIES.has(id)),
        token: answers.token ?? '',
        testingGuildIds: answers.testingGuilds.join(','),
        botColor: answers.botColor,
        developerUsername: extras.developerUsername,
        pm: { run: runPrefix(extras.agent), isBun: extras.agent === 'bun', isPnpm: extras.agent === 'pnpm' },
        engines: ownPackage.engines
    };
}
