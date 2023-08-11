import {pb} from "@/functions/database_functions/hooks";
import {devLog, hashString} from "@/functions/utility_functions/utilities";
import {User} from "@/interfaces/UserInterfaces";
import DBCacheManager from "@/functions/database_functions/cache";
import {retrieveSongAnalytics} from "@/functions/spotify_functions/spotify";
import {artistsToRefIDs, genresToRefIDs, resolveNewArtists} from "@/functions/database_functions/resolve";
import {Artist, Genre, Song} from "@/interfaces/DatabaseInterfaces";

export const putPBData = async (collection: string, data: any) => {
    await pb.collection(collection).create(data);
}

export const updatePBData = async (collection: string, data: any, id: string) => {
    await pb.collection(collection).update(id, data);
}

export const deletePBData = async (collection: string, id: string) => {
    await pb.collection(collection).delete(id);
}

/**
 * Will update / create a record in the PRDB for a user.
 * @param user A user object.
 * @returns {Promise<void>}
 */
export const postUser = async (user : Omit<User, "created" | "modified">): Promise<void> => {
    devLog("User " + user.username + " posted.", "info");
    user.id = hashString(user.user_id);
    await pb.collection('users').create(user).catch(
        function (err) {
            console.warn("Error posting user: ")
            console.warn(err);
        }
    )
}

export const postSong = async (song: Song) => {
    const databaseCache = await DBCacheManager.getInstance();
    if (!song.song_id || !song.id) {
        throw new Error("Song must have a database ID and be formatted before posting!");
    }

    if (databaseCache.songs.some(s => s.id === song.id)) {
        console.info('Song attempting to be posted already cached.');
        return;
    }
    if (!song.hasOwnProperty('analytics') || Object.keys(song.analytics).length === 0) {
        console.info(`Resolving analytics for a song (${song.song_id}) attempting to be posted.`);
        await retrieveSongAnalytics(song.song_id).then(res =>
            song.analytics = res
        );
    }

    let artists = song.artists as Artist[];
    const unresolvedArtists = artists.filter((a1: { artist_id: string; }) => !databaseCache.artists.some(a2 => a1.artist_id === a2.artist_id));
    const cachedArtists = databaseCache.artists.filter(a => artists.some(e => e.artist_id === a.artist_id));
    if (unresolvedArtists.length > 0) {
        artists = cachedArtists.concat(await resolveNewArtists(unresolvedArtists));
    }

    song.artists = await artistsToRefIDs(artists);
    await pb.collection('songs').create(song);
    databaseCache.addSong(song);
}

export const postArtist = async (artist: Artist) => {
    const databaseCache = await DBCacheManager.getInstance();

    if (artist.hasOwnProperty("artist_id") && !artist.hasOwnProperty("id")) {
        throw new Error("Artist must have database id before posting!");
    } else if (!artist.hasOwnProperty("artist_id") && artist.hasOwnProperty("id")) {
        throw new Error("Artist must be formatted before posting!");
    }

    artist.genres = await genresToRefIDs(artist.genres as string[]);
    await pb.collection('artists').create(artist);
    databaseCache.addArtist(artist)
}


export const postGenre = async (genre: Genre) => {
    const databaseCache = await DBCacheManager.getInstance();
    if (!genre.hasOwnProperty("id")) {
        throw new Error("Genre must have database id before posting!");
    }
    await pb.collection('genres').create(genre);
    databaseCache.addGenre(genre);
}
