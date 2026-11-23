---
'@seedcord/plugin-oauth': minor
---

Added `isRedirectListed()` to `OAuthClient`. It checks whether your application has the client's `redirectUri` under Redirects on its OAuth2 page, which Discord needs before it accepts a login.
