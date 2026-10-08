// gateway already used 5s. discord's 3s first-ack deadline is the floor.
export const DRAIN_WINDOW_MS = 5000;

const DRAIN_HEADROOM_MS = 1000;
export const DRAIN_TASK_TIMEOUT_MS = DRAIN_WINDOW_MS + DRAIN_HEADROOM_MS;
