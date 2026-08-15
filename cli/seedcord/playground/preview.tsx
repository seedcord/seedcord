import { render } from 'ink';
import React from 'react';

import { DevStore } from '#ui/stores/DevStore';

import { PreviewHarness } from './PreviewHarness';
import { SCENARIOS } from './scenarios';

import type { Scenario } from './scenarios/types';

function selectScenario(): Scenario {
    const fallback = SCENARIOS[0];
    if (!fallback) throw new Error('No preview scenarios registered.');
    const requested = process.argv[2];
    return SCENARIOS.find((scenario) => scenario.name === requested) ?? fallback;
}

function main(): void {
    const store = new DevStore();
    const scenario = selectScenario();
    render(React.createElement(PreviewHarness, { store, scenario }), {
        exitOnCtrlC: false,
        alternateScreen: true
    });
}

main();
