import {pb} from "@/functions/database_functions/hooks";
import {RecordSubscription} from "pocketbase";
import {hashString} from "@/functions/utility_functions/utilities";
import {Artist, Song} from "@/interfaces/DatabaseInterfaces";
import {User} from "@/interfaces/UserInterfaces";

export const disableAutoCancel = () => {
    pb.autoCancellation(false);
}

export const enableAutoCancel = () => {
    pb.autoCancellation(true);
}

export const useAuthStore = () => {
    return pb.authStore;
}


export const subscribe = (collection: string, record: string = '*', callback: (data: RecordSubscription<Record<string, any>>) => void) => {
    pb.collection(collection).subscribe(record, callback);
}

export const unsubscribe = (collection: string, record: string = '*') => {
    pb.collection(collection).unsubscribe(record);
}

/**
 * Will always return the database id for either a song, artist or album.
 * The type does not need to be specified and the id may **not** always be valid
 * as it can be unresolved.
 */
export const retrieveDatabaseID = (item: Artist | Song | User) => {
    if ("song_id" in item) {
        return hashString(item.song_id);
    } else if ("artist_id" in item) {
        return hashString(item.artist_id)
    } else if ("user_id" in item) {
        // Assumes a user record is being submitted, otherwise it would
        // be impossible to know what the id was
        return item.id;
    } else {
        throw new Error("Unknown type seen in retrieveDatabaseID.");
    }
}