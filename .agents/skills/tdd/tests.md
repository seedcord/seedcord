# Good and bad tests

## Good tests

Integration-style. Test through the real interface, with real collaborators.

```typescript
import { describe, expect, it } from 'vite-plus/test';

import { Kv } from '#src/kv/Kv';
import { MemoryDriver } from '#src/kv/MemoryDriver';

interface Profile {
    bio: string;
    joinedAt: Date;
}

describe('KvCollection', () => {
    // GOOD: checks what a caller gets back through the public methods
    it('reads back a stored record with its Date as an ISO string', async () => {
        const profiles = new Kv(new MemoryDriver()).collection<Profile>('profile');
        const joinedAt = new Date('2026-01-01T00:00:00Z');

        await profiles.set('1', { bio: 'hi', joinedAt });

        expect(await profiles.get('1')).toEqual({ bio: 'hi', joinedAt: joinedAt.toISOString() });
    });
});
```

Characteristics:

- Checks the behavior that a caller depends on.
- Uses the public API only.
- Still passes after internal refactors.
- Its name describes what the code does, and leaves out how.
- One logical assertion per test.

## Bad tests

Implementation-detail tests, coupled to internal structure.

```typescript
// BAD: asserts on a call to a collaborator instead of the result
it('set calls the driver', async () => {
    const driver = new MemoryDriver();
    const spy = vi.spyOn(driver, 'set');

    await new Kv(driver).collection<Profile>('profile').set('1', profile);

    expect(spy).toHaveBeenCalledOnce();
});
```

Red flags:

- Mocking or spying on collaborators you own.
- Reaching into private methods.
- Asserting on call counts or order.
- The test breaks when you refactor without changing behavior.
- The test name describes how it works.
- Checking through a side channel when the interface can show the result.

```typescript
// BAD: reads the driver's raw storage to check the record
it('delete removes the key from the driver', async () => {
    const driver = new MemoryDriver();
    const profiles = new Kv(driver).collection<Profile>('profile');

    await profiles.set('1', profile);
    await profiles.delete('1');

    expect(await driver.get('profile:1')).toBeUndefined(); // ties the test to the key format
});

// GOOD: checks through the public method
it('reads nothing back after delete', async () => {
    const profiles = new Kv(new MemoryDriver()).collection<Profile>('profile');

    await profiles.set('1', profile);
    await profiles.delete('1');

    expect(await profiles.get('1')).toBeUndefined();
});
```
