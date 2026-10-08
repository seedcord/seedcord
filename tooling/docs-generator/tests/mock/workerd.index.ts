/**
 * The build `@seedcord/mock-docs` resolves to under the `workerd` condition.
 *
 * @packageDocumentation
 */

import { MockRemoteBase } from '@seedcord/fixture-base';

// both builds export this from one file
export { mockVariable } from './variable.js';

/** The `workerd` build's host, declared apart from the default build's class of the same name. */
export class MockRuntimeHost extends MockRemoteBase {
    /** Answers one request. */
    public fetch(request: string): string {
        return request;
    }
}
