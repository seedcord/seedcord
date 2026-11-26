import { TASK_HEADROOM_MS } from '#src/lifecycle/withTimeout';

// gateway uses 5s. discord's 3s first-ack deadline is the floor.
export const DRAIN_WINDOW_MS = 5000;

export const DRAIN_TASK_TIMEOUT_MS = DRAIN_WINDOW_MS + TASK_HEADROOM_MS;
