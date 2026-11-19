import { assertDeclaredRuntime } from '#node/assertRuntimeVersion';

// the edge bundle never reaches this entry
assertDeclaredRuntime();

export * from '#node/Lifecycle';
export { healthCheckConfig, HealthResponder } from '#node/HealthResponder';
export { WebServer } from '#node/WebServer';
export { shutdownOf } from '#node/ServerHost';
export { setEnvaptBaseDir } from '#node/envaptBaseDir';
