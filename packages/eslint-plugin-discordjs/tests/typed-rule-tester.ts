import * as path from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

RuleTester.afterAll = afterAll;
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
