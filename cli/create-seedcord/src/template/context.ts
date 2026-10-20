import { basename } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import ownPackage from '#package' with { type: 'json' };

import { execPrefix, runPrefix } from '#cli/packageManager';
import { intentsFor, partialsFor } from '#interview/capabilities';
import { STEPS } from '#interview/steps';

import type { Answers } from '#interview/types';
import type { AgentName } from 'package-manager-detector';

type SharedAnswers = Omit<Answers, 'transport' | 'runtime' | 'capabilities'>;

export type ScaffoldAnswers =
    | (SharedAnswers & Pick<Answers, 'capabilities'> & { transport: 'gateway' })
    | (SharedAnswers & Pick<Answers, 'runtime'> & { transport: 'http' });

export function capabilitiesOf(answers: ScaffoldAnswers): string[] {
    return answers.transport === 'gateway' ? answers.capabilities : [];
}

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
    cliOnBun: boolean;
    pm: { run: string; exec: string; isPnpm: boolean };
    engines: { node: string; bun: string };
}

function required<Key extends keyof Answers>(answers: Partial<Answers>, key: Key): Answers[Key] {
    const answer = answers[key];
    if (answer === undefined) {
        const flag = STEPS.find((step) => step.key === key)?.flag.name ?? key;
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [flag, 'No answer was collected.']);
    }

    return answer;
}

// runFlow either fills these or throws
export function requireScaffoldAnswers(answers: Partial<Answers>): ScaffoldAnswers {
    const shared: SharedAnswers = {
        directory: required(answers, 'directory'),
        token: required(answers, 'token'),
        testingGuilds: required(answers, 'testingGuilds'),
        botColor: required(answers, 'botColor'),
        install: required(answers, 'install'),
        git: required(answers, 'git')
    };

    return required(answers, 'transport') === 'gateway'
        ? { ...shared, transport: 'gateway', capabilities: required(answers, 'capabilities') }
        : { ...shared, transport: 'http', runtime: required(answers, 'runtime') };
}

export function buildContext(
    answers: ScaffoldAnswers,
    extras: { developerUsername: string; agent: AgentName }
): TemplateContext {
    const isGateway = answers.transport === 'gateway';
    const isEdge = answers.transport === 'http' && answers.runtime === 'edge';
    const capabilities = capabilitiesOf(answers);

    return {
        projectName: basename(answers.directory),
        isGateway,
        isEdge,
        transportPackage: isGateway ? '@seedcord/gateway' : '@seedcord/http',
        intents: isGateway ? intentsFor(capabilities) : [],
        partials: isGateway ? partialsFor(capabilities) : [],
        hasMessages: capabilities.some((id) => MESSAGE_CAPABILITIES.has(id)),
        token: answers.token?.value ?? '',
        testingGuildIds: answers.testingGuilds.join(','),
        botColor: answers.botColor,
        developerUsername: extras.developerUsername,
        // cloudflare's config loader throws on bun
        cliOnBun: extras.agent === 'bun' && !isEdge,
        pm: { run: runPrefix(extras.agent), exec: execPrefix(extras.agent), isPnpm: extras.agent === 'pnpm' },
        engines: ownPackage.engines
    };
}
