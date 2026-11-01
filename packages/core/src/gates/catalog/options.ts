import type { NoticeConstructor } from '#stops/Notice';

/** The override a gate with a single refusal accepts. */
export interface GateNoticeOptions {
    /** Your Notice class, constructed and thrown in place of the default refusal. */
    notice?: NoticeConstructor;
}
