import type { EpochMs } from '@seedcord/types';

const DISCORD_EPOCH_MS = 1_420_070_400_000n; // 2015-01-01
const TIMESTAMP_SHIFT = 22n; // the top 42 bits of a snowflake carry the timestamp

export function timestampFromSnowflake(snowflake: string): EpochMs {
    return Number((BigInt(snowflake) >> TIMESTAMP_SHIFT) + DISCORD_EPOCH_MS) as EpochMs;
}
