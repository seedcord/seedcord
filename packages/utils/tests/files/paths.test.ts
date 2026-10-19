import { describe, expect, it } from 'vitest';

import { workerdPath } from '#src/files/paths';

describe('workerdPath', () => {
    it('makes a Windows path absolute for POSIX path functions', () => {
        expect(workerdPath(String.raw`D:\bot\src\handlers`)).toBe('/D:/bot/src/handlers');
    });

    it('leaves a POSIX path as it is', () => {
        expect(workerdPath('/home/bot/src')).toBe('/home/bot/src');
    });
});
