# @seedcord/plugin-tasks

## 0.1.2-next.0

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/logger` 0.7.0 → 0.8.0-next.0
- `@seedcord/errors` 0.16.1 → 0.17.0-next.0
- `@seedcord/utils` 0.10.0 → 0.10.1-next.0
- `@seedcord/core` 0.14.1 → 0.15.0-next.0
- `@seedcord/gateway` 0.11.1 → 0.12.0-next.0
- `@seedcord/http` 0.14.1 → 0.15.0-next.0

## 0.1.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/core` 0.14.0 → 0.14.1
- `@seedcord/gateway` 0.11.0 → 0.11.1
- `@seedcord/http` 0.14.0 → 0.14.1

## 0.1.0

### ✨ Minor

- Added `@seedcord/plugin-tasks`, which runs the `Task` classes in a folder on a cron pattern, or once later through `tasks.schedule()`. Scheduled tasks are stored in `config.kv`, so they're still there after a restart if your driver keeps its records. Cron jobs and scheduled jobs don't run on their own under `seedcord dev` unless you pass `runInDev: true` to the plugin. ([#434](https://github.com/seedcord/seedcord/pull/434), thanks [@camdzic](https://github.com/camdzic))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.16.0-next.1 → 0.16.0
- `@seedcord/utils` 0.10.0-next.1 → 0.10.0
- `@seedcord/logger` 0.7.0-next.1 → 0.7.0
