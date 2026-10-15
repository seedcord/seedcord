import * as path from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

// RuleTester's afterAll clears the parser caches. the next test file then rebuilds the whole typed program
// that clear releases file watchers. the project service stubs those
RuleTester.afterAll = (): void => undefined;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// a plain RuleTester (no type information) for the AST-only rules
export function createRuleTester(): RuleTester {
    return new RuleTester();
}

export function createTypedRuleTester(): RuleTester {
    return new RuleTester({
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.ts*']
                },
                tsconfigRootDir: path.join(import.meta.dirname, 'fixtures')
            }
        }
    });
}
