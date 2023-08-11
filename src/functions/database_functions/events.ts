import {disableAutoCancel, enableAutoCancel, retrieveDatabaseID} from "@/functions/database_functions/utilities";
import {User} from "@/interfaces/UserInterfaces";
import {retrieveFollowing} from "@/functions/database_functions/user_meta";
import {fetchPBData} from "@/functions/database_functions/fetch";
import {resolveItems} from "@/functions/utility_functions/utilities";
import {retrieveUser} from "@/functions/database_functions/users";
import {putPBData} from "@/functions/database_functions/push";
import {Artist, Song, UserEvent} from "@/interfaces/DatabaseInterfaces";
import {Album, Playlist} from "@/interfaces/SpotifyInterfaces";

/**
 * Creates an event in the database.
 *
 * An event is any action that another user following the target user will be notified about.
 *  The event reference number is a reference to the type of event triggered.
 *
 *  1-50 | Major events
 *
 *  1: Added recommendation
 *
 *  2: Added annotations
 *
 *  3: Added review
 *
 *  51-100 | Minor events
 *
 *  51: Removes recommendation
 *
 *  52: Follows user
 *
 *  53: Edit recommendation
 *
 *
 * @param event_ref_num
 * @param user_id
 * @param item
 * @param item_type
 */
export const createEvent = async function (event_ref_num: number, user_id: string, item: Artist | Song | Album | Playlist | User, item_type: "artists" | "songs" | "albums" | "users" | "playlists") {
    disableAutoCancel();
    const user: User = await retrieveUser(user_id);
    let item_id;
    console.log(item_type)
    if (item_type === "songs" || item_type === "artists" || item_type === "users") {
        item_id = retrieveDatabaseID(item as Song | Artist | User);
    } else if ("playlist_id" in item) {
        item_id = item.playlist_id;
    } else if ("album_id" in item) {
        item_id = item.album_id;
    }
    console.log({
        event_ref_num: event_ref_num,
        user_id: user_id,
        item: item,
        item_type: item_type,
        item_id: item_id
    });
    await putPBData("events",
        {
            owner: user.id,
            ref_num: event_ref_num,
            item: {id: item_id, type: item_type}
        }
    )
    enableAutoCancel();
}
export const retrieveEventsForUser = async function (user_id: string, page: number = 1, eventsPerPage: number = 50) {
    const following: Array<User> = await retrieveFollowing(user_id);
    const followingMap = new Map();
    // Create a map to reference users from their db id
    following.forEach(u => followingMap.set(u.id, u));
    const conditions = following.map(u => `owner.id = "${u.id}"`);
    const filter = conditions.join(" || ");

    let events: Array<UserEvent> = await fetchPBData("events", filter, '-created', page, eventsPerPage);

    // Replace the owner.id with the actual user object in the events array
    events.forEach(event => {
        if (event.owner && followingMap.has(event.owner)) {
            event.owner = followingMap.get(event.owner);
        }
    });

    await resolveItems(events);

    return events;
}