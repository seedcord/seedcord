const MILLISECOND_PAD = 3;

export class FilenameResolver {
    private static pad(value: number): string {
        return value.toString().padStart(2, '0');
    }

    private static buildTimestamp(): { date: string; timestamp: string } {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = this.pad(now.getMonth() + 1);
        const dd = this.pad(now.getDate());
        const hh = this.pad(now.getHours());
        const min = this.pad(now.getMinutes());
        const ss = this.pad(now.getSeconds());
        const ms = now.getMilliseconds().toString().padStart(MILLISECOND_PAD, '0');

        const date = `${yyyy}-${mm}-${dd}`;
        const timestamp = `${date}-${hh}${min}${ss}-${ms}`;

        return { date, timestamp };
    }

    public static resolve(template: string, channel: string): string {
        const { date, timestamp } = this.buildTimestamp();

        return template.replace('{channel}', channel).replace('{date}', date).replace('{timestamp}', timestamp);
    }
}
