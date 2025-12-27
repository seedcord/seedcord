import type { TuiLogPanelOptions } from './types';

interface ChannelState {
    readonly name: string;
    lines: string[];
}

export class LogPanel {
    private readonly channels = new Map<string, ChannelState>();
    private currentChannel: string;

    public constructor(
        initialChannel: string,
        private readonly options: TuiLogPanelOptions = {}
    ) {
        this.currentChannel = initialChannel;
        this.ensureChannel(initialChannel);
    }

    public setChannel(channel: string): void {
        this.currentChannel = channel;
        this.ensureChannel(channel);
    }

    public channel(): string {
        return this.currentChannel;
    }

    public knownChannels(): readonly string[] {
        return [...this.channels.keys()];
    }

    public clear(channel?: string): void {
        const key = channel ?? this.currentChannel;
        const state = this.channels.get(key);
        if (state) state.lines = [];
    }

    public append(line: string, channel?: string): void {
        const key = channel ?? this.currentChannel;
        const state = this.ensureChannel(key);
        state.lines.push(line);

        const MAX_LINES = 200;
        const max = this.options.maxLines ?? MAX_LINES;
        if (state.lines.length > max) {
            state.lines.splice(0, state.lines.length - max);
        }
    }

    public renderLines(): string[] {
        const title = this.options.title ?? 'Logs';
        const placeholder = this.options.placeholder ?? 'Waiting for logs...';

        const state = this.channels.get(this.currentChannel);
        const content = state?.lines.length ? state.lines : [placeholder];

        const maxVisible = this.options.maxLines ?? 20;
        const visibleContent = content.length > maxVisible ? content.slice(-maxVisible) : content;

        return [title, ...visibleContent];
    }

    private ensureChannel(channel: string): ChannelState {
        const existing = this.channels.get(channel);
        if (existing) return existing;

        const created: ChannelState = { name: channel, lines: [] };
        this.channels.set(channel, created);
        return created;
    }
}
