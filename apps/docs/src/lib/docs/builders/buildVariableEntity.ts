import type { BaseEntityModel, VariableEntityModel } from '../types';

export function buildVariableEntity(base: BaseEntityModel & { kind: 'variable' }): VariableEntityModel {
    return { ...base, declaration: base.signature };
}
