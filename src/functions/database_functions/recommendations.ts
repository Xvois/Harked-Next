import {deletePBData, putPBData, updatePBData} from "@/functions/database_functions/push";
import {hashString} from "@/functions/utility_functions/utilities";
import {getLIName} from "@/functions/analysis_functions/general";
import {fetchPBDataByID} from "@/functions/database_functions/fetch";
import {artistsToRefIDs, songsToRefIDs} from "@/functions/database_functions/resolve";
import {retrieveDatabaseID} from "@/functions/database_functions/utilities";
import {Artist, ProfileRecommendations, Recommendation, Song} from "@/interfaces/DatabaseInterfaces";
import {Album} from "@/interfaces/SpotifyInterfaces";
import {createEvent} from "@/functions/database_functions/events";

/**
 * Creates a recommendation for the target user on their page.
 *
 * **Has built in createEvent side effect.**
 * @param user_id
 * @param item
 * @param type
 * @param description
 */
export const submitRecommendation = async function (user_id: string, item: Song | Artist | Album, type: "songs" | "artists" | "albums", description: string) {
    const id = hashString(getLIName(item) + description + user_id);
    let currRecommendations = await fetchPBDataByID<ProfileRecommendations>("profile_recommendations", hashString(user_id));
    if (currRecommendations.recommendations === null) {
        currRecommendations.recommendations = [];
    }
    switch (type) {
        case 'artists':
            const [artistRefID]: Array<string> = await artistsToRefIDs([item as Artist]);
            const artistItemObj = {type: type, id: artistRefID}
            const artistRecommendation = {id: id, item: artistItemObj, description: description};
            await putPBData("recommendations", artistRecommendation);
            const newRecs_a: ProfileRecommendations = {
                ...currRecommendations,
                recommendations: (currRecommendations.recommendations as string[]).concat(id)
            }
            await updatePBData("profile_recommendations", newRecs_a, currRecommendations.id);
            break;
        case 'songs':
            const [songRefID]: Array<string> = await songsToRefIDs([item as Song]);
            const songItemObj = {type: type, id: songRefID}
            const songRecommendation = {id: id, item: songItemObj, description: description};
            await putPBData("recommendations", songRecommendation);
            const newRecs_s = {
                ...currRecommendations,
                recommendations: (currRecommendations.recommendations as string[]).concat(id)
            }
            await updatePBData("profile_recommendations", newRecs_s, currRecommendations.id);
            break;
        case 'albums':
            const albumItemObj = {id: (item as Album).album_id, type: type};
            const albumRecommendation = {id: id, item: albumItemObj, description: description};
            await putPBData("recommendations", albumRecommendation);
            const newRecs_al = {
                ...currRecommendations,
                recommendations: (currRecommendations.recommendations as string[]).concat(id)
            }
            await updatePBData("profile_recommendations", newRecs_al, currRecommendations.id);
            break;
    }
    createEvent(1, user_id, item, type);
}

/**
 * Modifies an existing recommendation with a new description.
 *
 * **Has built in createEvent side effect.**
 * @param user_id
 * @param existingRecommendation
 * @param type
 * @param newDescription
 */
export const modifyRecommendation = async (user_id: string, existingRecommendation: Omit<Recommendation, 'item'> & { item: Artist | Song | Album }, type: "songs" | "artists" | "albums", newDescription: string) => {
    // We need to unresolve the item to its id and type
    let unresolvedExistingRec: Recommendation = structuredClone(existingRecommendation);
    let item = existingRecommendation.item;
    let item_id: string | null = null;

    if ("song_id" in item || "artist_id" in item) {
        item_id = retrieveDatabaseID(item);
    } else if ("album_id" in item) {
        item_id = item.album_id;
    }

    if (item_id) {
        unresolvedExistingRec.item = {id: item_id, type: type};
        const newRecommendation = {
            ...unresolvedExistingRec,
            description: newDescription
        };
        await updatePBData("recommendations", newRecommendation, existingRecommendation.id).then(() => {
            createEvent(53, user_id, existingRecommendation.item, type);
        });
    } else {
        throw new Error("item_id not resolved in modifyRecommendation.")
    }
}

/**
 * Deletes a profile recommendation.
 *
 * **Does not have a built-in createEvent side effect.**
 * @param rec_id
 */
export const deleteRecommendation = async function (rec_id: string) {
    await deletePBData("recommendations", rec_id);
}