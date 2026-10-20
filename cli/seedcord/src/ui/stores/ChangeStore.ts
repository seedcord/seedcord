import { TypedEventEmitter } from '@seedcord/event-emitter';

export class ChangeStore extends TypedEventEmitter<{ change: [] }> {
    // useSyncExternalStore resubscribes whenever subscribe changes identity
    public readonly subscribe = (onChange: () => void): (() => void) => {
        this.on('change', onChange);
        return () => {
            this.off('change', onChange);
        };
    };
}
