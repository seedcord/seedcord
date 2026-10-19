---
'@seedcord/event-emitter': patch
---

Fixed `waitFor` treating a timeout above Node's 32-bit timer cap as already expired, because `setTimeout` clamps such a delay to 1ms. A longer wait is now chained, and a non-finite one waits like an omitted timeout.
