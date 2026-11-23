import { runInNewContext } from 'node:vm';

import { BOT_FILES_KEY, BotLayout } from '@seedcord/utils/internal';
import { describe, expect, it } from 'vite-plus/test';

import { builtFilesSource } from '#commands/build/builder/builtFiles';

import type { BuiltLists } from '#core/project/ProjectFiles';

function slotAfterRunning(lists: BuiltLists): Record<string, unknown> {
    const source = builtFilesSource({
        layout: BotLayout.openAt('/bot'),
        lists,
        rootExpression: JSON.stringify('/bot'),
        rootKey: '/',
        sourcePaths: false
    });
    const slot = `globalThis[Symbol.for(${JSON.stringify(BOT_FILES_KEY)})]`;
    // vite replaces import.meta.glob during a build. node's vm can't parse import.meta in a script
    const runnable = source.replaceAll('import.meta.glob', 'glob');
    // justified: the module assigns a plain object to that slot
    return runInNewContext(`${runnable}\n${slot}`, { glob: () => ({}) }) as Record<string, unknown>;
}

describe('the built files module', () => {
    it('hands the folders and the emojis that the build listed to the built bot', () => {
        const lists = { folders: ['/handlers'], emojis: [{ key: 'Dot', name: 'dot' }] };

        expect(slotAfterRunning(lists)).toMatchObject(lists);
    });
});
