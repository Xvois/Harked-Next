import PocketBase, {RecordSubscription} from "pocketbase";
import {subscribe, unsubscribe} from "@/database_functions/utilities";

export const pb = new PocketBase("https://harked.fly.dev/");

export class Subscription {
    private readonly collection: string;
    private readonly record: string;
    private readonly callback: (data: any) => void;
    private readonly deleteOnCallback: any;
    constructor(collection: string, record: string, callback: Function, deleteOnCallback = false) {
        this.collection = collection;
        this.record = record;
        this.callback = data => {
            callback(data);
            if (this.deleteOnCallback) {
                this.delete();
            }
        };
        this.deleteOnCallback = deleteOnCallback;
    }

    invoke() {
        subscribe(this.collection, this.record, this.callback);
    }

    delete() {
        unsubscribe(this.collection, this.record);
    }
}