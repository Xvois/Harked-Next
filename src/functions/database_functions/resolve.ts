import {hashString} from "@/functions/utility_functions/utilities";
import {postArtist, postGenre, postSong} from "@/functions/database_functions/push";
import DBCacheManager from "@/functions/database_functions/cache";
import {Artist, Genre, Song} from "@/interfaces/DatabaseInterfaces";
import {fetchSpotify} from "@/functions/utility_functions/fetch";
import {formatArtist} from "@/functions/database_functions/format";

export const artistsToRefIDs = async (artists: Artist[]) => {
    const databaseCache = await DBCacheManager.getInstance();
    let ids = [];
    const artistIDs = artists.map(e => e.artist_id);
    const newArtistIDs = artistIDs.filter(id => !databaseCache.artists.some(a => a.artist_id === id));

    for (let i = 0; i < artists.length; i++) {
        let artist = artists[i];
        artist.id = hashString(artist.artist_id);
        ids.push(artist.id);
        if (newArtistIDs.includes(artist.artist_id)) {
            await postArtist(artist);
        }
    }
    return ids;
}
export const genresToRefIDs = async (genres: string[]) => {
    const databaseCache = await DBCacheManager.getInstance();
    let ids = [];
    // Genres are added as an array of strings, but stored in cache as having their string and id
    const newGenres = genres.filter(g1 => !databaseCache.genres.some(g2 => g2.genre === g1));

    for (let i = 0; i < genres.length; i++) {
        let genre = genres[i];
        const id = hashString(genre);
        ids.push(id);
        if (newGenres.includes(genre)) {
            await postGenre({
                id: id,
                genre: genre
            } as Genre);
        }
    }
    return ids;
}
export const songsToRefIDs = async (songs: Song[]) => {
    const databaseCache = await DBCacheManager.getInstance();
    const existingSongIDs = new Set(databaseCache.songs.map((song) => song.song_id));
    const ids = [];

    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const {song_id} = song;
        const id = hashString(song_id);
        song.id = id;
        ids.push(id);

        if (!existingSongIDs.has(song_id)) {
            await postSong(song);
        }
    }

    return ids;
};
export async function resolveNewArtists(newArtists: {artist_id: string}[]) {
    const artistPromises = newArtists.map(async (e) => {
        const artistData = await fetchSpotify(`artists/${e.artist_id}`);
        return formatArtist(artistData);
    });
    return Promise.all(artistPromises);
}