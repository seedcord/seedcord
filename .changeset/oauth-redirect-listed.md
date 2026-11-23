---
'@seedcord/plugin-oauth': minor
---

Added `isRedirectListed()` to `OAuthClient`. It tells you whether the client's `redirectUri` is under Redirects on your application's OAuth2 page. Discord refuses logins until it is.
