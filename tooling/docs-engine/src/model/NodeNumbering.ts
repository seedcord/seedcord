import { Slugger } from '#src/Slugger';

// one per package. every entry's adapter shares it to keep node ids and slugs unique.
export class NodeNumbering {
    readonly slugger = new Slugger();
    private nextId = 1;

    id(): number {
        return this.nextId++;
    }
}
