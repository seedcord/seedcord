import { expectTypeOf } from 'vite-plus/test';

import type { FRAMEWORK_CHANNELS } from '#src/channels';
import type { FrameworkChannel } from '@seedcord/types';

expectTypeOf<(typeof FRAMEWORK_CHANNELS)[number]>().toEqualTypeOf<FrameworkChannel>();
