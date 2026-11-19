import { assertDeclaredRuntime } from '#node/assertRuntimeVersion';

// the edge bundle never reaches this entry
assertDeclaredRuntime();

export * from '#node/Lifecycle';
export { shutdownOf } from '#node/ServerHost';
export { setEnvaptBaseDir } from '#node/envaptBaseDir';
