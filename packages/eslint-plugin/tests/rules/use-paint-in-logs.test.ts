import dedent from 'dedent';

import rule from '#src/rules/use-paint-in-logs';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('use-paint-in-logs', rule, {
    valid: [
        // paint is the styling the log line is supposed to use
        dedent`
            import { Logger } from '@seedcord/logger';
            import { paint } from '@seedcord/errors';
            declare const log: Logger;
            log.info(\`bound \${paint.sky('/health')}\`);
        `,
        // an unstyled log line
        dedent`
            import { Logger } from '@seedcord/logger';
            declare const log: Logger;
            log.warn('the tunnel dropped');
        `,
        // chalk outside a log call is the CLI's own business
        dedent`
            import chalk from 'chalk';
            const banner = chalk.red('seedcord');
        `,
        // a same-named class that is not the seedcord Logger
        dedent`
            import chalk from 'chalk';
            class Logger {
                info(msg: string): void {}
            }
            declare const log: Logger;
            log.info(chalk.cyan('/health'));
        `,
        // a non-logger receiver
        dedent`
            import chalk from 'chalk';
            declare const console2: { info(msg: string): void };
            console2.info(chalk.cyan('/health'));
        `
    ],
    invalid: [
        // chalk as the whole argument
        {
            code: dedent`
                import { Logger } from '@seedcord/logger';
                import chalk from 'chalk';
                declare const log: Logger;
                log.info(chalk.cyan('/health'));
            `,
            errors: [{ messageId: 'usePaint' }]
        },
        // chalk inside a template literal
        {
            code: dedent`
                import { Logger } from '@seedcord/logger';
                import chalk from 'chalk';
                declare const log: Logger;
                log.error(\`route \${chalk.red('/health')} failed\`);
            `,
            errors: [{ messageId: 'usePaint' }]
        },
        // every level is covered
        {
            code: dedent`
                import { Logger } from '@seedcord/logger';
                import chalk from 'chalk';
                declare const log: Logger;
                log.trace(chalk.dim('waiting'));
                log.debug(chalk.dim('waiting'));
                log.warn(chalk.dim('waiting'));
            `,
            errors: [{ messageId: 'usePaint' }, { messageId: 'usePaint' }, { messageId: 'usePaint' }]
        },
        // chalk.hex reads as chalk too
        {
            code: dedent`
                import { Logger } from '@seedcord/logger';
                import chalk from 'chalk';
                declare const log: Logger;
                log.info(chalk.hex('#f04e36')('seedcord'));
            `,
            errors: [{ messageId: 'usePaint' }]
        },
        // a renamed default import still resolves to chalk
        {
            code: dedent`
                import { Logger } from '@seedcord/logger';
                import c from 'chalk';
                declare const log: Logger;
                log.info(c.green('ready'));
            `,
            errors: [{ messageId: 'usePaint' }]
        },
        // a later argument carries the styling
        {
            code: dedent`
                import { Logger } from '@seedcord/logger';
                import chalk from 'chalk';
                declare const log: Logger;
                log.info('bound', chalk.cyan('/health'));
            `,
            errors: [{ messageId: 'usePaint' }]
        },
        // a plugin logs through the logger it inherits, with no Logger import in the file
        {
            code: dedent`
                import { PluginBase } from '@seedcord/core';
                import chalk from 'chalk';
                class Mongoose extends PluginBase {
                    connect(): void {
                        this.logger.info(chalk.cyan('mongodb://localhost'));
                    }
                }
            `,
            errors: [{ messageId: 'usePaint' }]
        }
    ]
});
