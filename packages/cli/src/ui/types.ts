export interface TuiCaptureConfig {
    readonly stdout?: boolean;
    readonly stderr?: boolean;
}

export interface TuiConfig {
    readonly stream?: NodeJS.WriteStream;
    readonly statusLine?: boolean;
    readonly alternateScreen?: boolean;

    readonly spinnerIntervalMs?: number;

    readonly captureOutput?: boolean | TuiCaptureConfig;
    readonly capturedMaxLines?: number;
}

export interface TuiSectionOptions {
    readonly order?: number;
}

export interface TuiLogPanelOptions {
    readonly title?: string;
    readonly maxLines?: number;
    readonly placeholder?: string;
}
