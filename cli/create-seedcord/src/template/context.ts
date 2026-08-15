import { basename } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { intentsFor, partialsFor } from '#interview/capabilities';

import type { Answers } from '#interview/types';

// capabilities and publicKey each belong to one transport, and runFlow leaves the other unset
export type ScaffoldAnswers = Partial<Answers> &
    Pick<Answers, 'botColor' | 'directory' | 'language' | 'token' | 'transport'>;

// the three that make messageCreate fire
const MESSAGE_CAPABILITIES = new Set(['guild-messages', 'message-text', 'direct-messages']);

export interface TemplateContext {
    projectName: string;
    isGateway: boolean;
    transportPackage: string;
    intents: string[];
    partials: string[];
    hasMessages: boolean;
    token: string;
    publicKey: string;
    botColor: string;
    developerUsername: string;
    pm: { run: string };
}

const REQUIRED = ['directory', 'language', 'transport', 'token', 'botColor'] as const;

// runFlow either fills these or throws
export function requireScaffoldAnswers(answers: Partial<Answers>): ScaffoldAnswers {
    for (const key of REQUIRED) {
        if (answers[key] === undefined) {
            throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [key, 'No answer was collected.']);
        }
    }

    return answers as ScaffoldAnswers;
}

export function buildContext(
    answers: ScaffoldAnswers,
    extras: { developerUsername: string; runCommand: string }
): TemplateContext {
    const isGateway = answers.transport === 'gateway';
    const capabilities = isGateway ? (answers.capabilities ?? []) : [];

    return {
        projectName: basename(answers.directory),
        isGateway,
        transportPackage: isGateway ? '@seedcord/gateway' : '@seedcord/http',
        intents: isGateway ? intentsFor(capabilities) : [],
        partials: isGateway ? partialsFor(capabilities) : [],
        hasMessages: capabilities.some((id) => MESSAGE_CAPABILITIES.has(id)),
        token: answers.token,
        publicKey: answers.publicKey ?? '',
        botColor: answers.botColor,
        developerUsername: extras.developerUsername,
        pm: { run: extras.runCommand }
    };
}
