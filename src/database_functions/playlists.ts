import {fetchPBData} from "@/database_functions/fetch";
import {PlaylistMetadata} from "@/interfaces/DatabaseInterfaces";

/**
 *
 * @param playlist_id
 * @returns PlaylistMetadata
 */
export const retrievePlaylistMetadata = async function (playlist_id: string): Promise<PlaylistMetadata> {
    return (await fetchPBData("playlist_metadata", `playlist_id="${playlist_id}"`, undefined, undefined, undefined, false))[0];
}