import * as path from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it } from 'vitest';

// RuleTester registers afterAll only to clear the parser caches. the project service stubs its file watchers
RuleTester.afterAll = (): void => undefined;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

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
