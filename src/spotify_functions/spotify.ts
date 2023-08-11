import {formatAlbum, formatArtist, formatPlaylist, formatSong} from "@/database_functions/format";
import {Artist, Song} from "@/interfaces/DatabaseInterfaces";
import {chunks} from "@/utility_functions/utilities";
import {fetchSpotify} from "@/utility_functions/fetch";
import {Album, Playlist} from "@/interfaces/SpotifyInterfaces";

/**
 * Returns a single playlist object.
 * @param playlist_id
 * @param retrieveTracks
 * @returns Playlist
 */
export const retrievePlaylist = async function (playlist_id: string, retrieveTracks: boolean = true) {
    let playlist = await fetchSpotify(`playlists/${playlist_id}`).catch(err => console.warn(err));

    if (!playlist) {
        return null;
    }

    if (retrieveTracks) {
        const totalTracks = playlist.tracks.total;
        const numCalls = Math.ceil(totalTracks / 50);
        const promises: Promise<Response | any[]>[] = [];

        // Max of 50 songs per call, so they must be batched
        for (let i = 0; i < numCalls; i++) {
            const offset = i * 50;
            const promise: Promise<Response | any[]> = fetchSpotify(`playlists/${playlist.id}/tracks?limit=50&offset=${offset}`)
                .then(response => response.items.map((e: any) => e.track))
                .catch(error => {
                    console.error(`Failed to retrieve tracks for playlist ${playlist.id}. Error: ${error}`);
                    return [];
                });

            promises.push(promise);
        }

        playlist.tracks = await Promise.all(promises).then(tracksArrays => tracksArrays.flat().filter(t => t !== null).map(t => formatSong(t)));
        const analytics = await batchAnalytics(playlist.tracks);
        playlist.tracks.map((t: Song, i: number) => t.analytics = analytics[i]);
    }

    return formatPlaylist(playlist);
}

/**
 * Returns an array of public non-collaborative playlists from a given user.
 * @param user_id
 * @returns {Promise<Array<Playlist>>>}
 */
export const retrievePlaylists = async function (user_id: string): Promise<Array<Playlist>> {
    // Fetch all playlists
    let playlists = (await fetchSpotify(`users/${user_id}/playlists`)).items;
    // Filter by those that are not collaborative and are public
    playlists = playlists.filter((p: any) => !p.collaborative && p.public);

    // Resolve all songs in each playlist
    const playlistTrackPromises = playlists.map((playlist: any) => {
        const totalTracks = playlist.tracks.total;
        const numCalls = Math.ceil(totalTracks / 50);
        const promises = [];

        // Max of 50 songs per call, so they must be batched
        for (let i = 0; i < numCalls; i++) {
            const offset = i * 50;
            const promise: Promise<Response | any[]> = fetchSpotify(`playlists/${playlist.id}/tracks?limit=50&offset=${offset}`)
                .then(response => response.items.map((e: any) => e.track))
                .catch(error => {
                    console.error(`Failed to retrieve tracks for playlist ${playlist.id}. Error: ${error}`);
                    return [];
                });

            promises.push(promise);
        }
        // Some tracks can be returned as null
        return Promise.all(promises).then(tracksArrays => tracksArrays.flat().filter(t => t !== null).map(t => formatSong(t)));
    });

    await Promise.all(playlistTrackPromises).then(tracksArrays => {
        tracksArrays.forEach((tracks, index) => {
            playlists[index].tracks = tracks;
        });
    });

    playlists = playlists.map((p: any) => formatPlaylist(p));

    return playlists;
}

/**
 * Returns the analytics for the song with a given id.
 * @param song_id
 * @returns Analytics
 */
export const retrieveSongAnalytics = async (song_id: string) => {
    const data = await fetchSpotify(`audio-features?ids=${song_id}`)
    return data.audio_features[0];
}

/**
 * Returns the results of a query of a certain type.
 * @param query
 * @param type
 * @param limit
 * @returns Promise<Array<any>>
 */
export const retrieveSearchResults = async function (query: string, type: "artists" | "songs" | "albums", limit: number = 10) {
    let typeParam;
    switch (type) {
        case 'artists':
            typeParam = 'artist';
            break;
        case 'songs':
            typeParam = 'track';
            break;
        case 'albums':
            typeParam = 'album'
            break;
    }

    let params = new URLSearchParams();
    params.append("q", query);
    params.append("type", typeParam);
    params.append("limit", limit.toString());

    let data = await fetchSpotify(`search?${params}`);
    let returnValue;

    if (type === 'artists') {
        data.artists = data.artists.items;
        data.artists = data.artists.map((a: any) => formatArtist(a));
        returnValue = data.artists;
    } else if (type === 'songs') {
        data.tracks = data.tracks.items;
        data.tracks = data.tracks.map((t: any) => formatSong(t));
        returnValue = data.tracks;
    } else {
        data = data.albums.items
        data = data.map((a: any) => formatAlbum(a));
        console.log(data)
        returnValue = data;
    }
    return returnValue;
}

/**
 * Returns an array of the analytics of the songs in the array
 * @param songs
 * @returns Array<Analytics>
 */
export const batchAnalytics = async (songs: Song[]) => {
    const songChunks = chunks(songs, 50);
    const analytics = [];
    for (const chunk of songChunks) {
        const songIDs = chunk.map((song: Song) => song.song_id).join(',');
        const result = await fetchSpotify(`audio-features?ids=${songIDs}`);
        analytics.push(...result.audio_features);
    }
    return analytics;
};

/**
 * Returns the artist objects from an array of artist ids.
 * @param artist_ids
 * @returns Array<Artist>
 */
export const batchArtists = async (artist_ids: Array<string>) => {
    const artistChunks = chunks(artist_ids, 50);
    const artists = [];
    for (const chunk of artistChunks) {
        const ids = chunk.join(',');
        const result = (await fetchSpotify(`artists/?ids=${ids}`)).artists;
        artists.push(...result.map(function (e: any) {
            return formatArtist(e);
        }));
    }
    return artists;
};

/**
 * Returns any albums from a given that contain the tracks given.
 * @param artistID
 * @param tracks
 */
export const getAlbumsWithTracks = async function (artistID: string, tracks: Array<Song>) {
    let albumsWithTracks: Album[] = [];

    if (!tracks) {
        return [];
    }

    let albums: Array<Album>;

    albums = (await fetchSpotify(`artists/${artistID}/albums`)).items;
    const albumPromises = albums.map((album) => fetchSpotify(`albums/${album.id}/tracks`));
    const albumTracks = await Promise.all(albumPromises);
    albums.forEach((a, i) => {
        a.tracks = albumTracks[i].items;
    });

    for (let i = 0; i < albums.length; i++) {
        const album = albums[i];
        const trackList = album.tracks;
        album["saved_songs"] = trackList.filter((t1) => tracks.some(t2 => t1.id === t2.song_id));
        if (album["saved_songs"].length > 0 && !albumsWithTracks.some((item) => item["saved_songs"]?.length === album["saved_songs"]?.length && item.name === album.name)) {
            albumsWithTracks.push(formatAlbum(album));
        }
    }

    return albumsWithTracks;
}

/**
 * Returns similar artists to the artist id passed in.
 * @param id
 * @returns Array<Artist>
 */
export const getSimilarArtists = async (id: string) => {
    return (await fetchSpotify(`artists/${id}/related-artists`)).artists.map((a: any) => formatArtist(a));
}

export const getTrackRecommendations = async (seed_artists: string[], seed_genres: string[], seed_tracks: string[], limit = 20) => {
    let params = new URLSearchParams();

    for (const artist of seed_artists) {
        params.append("seed_artists", artist);
    }

    for (const genre of seed_genres) {
        params.append("seed_genres", genre);
    }

    for (const track of seed_tracks) {
        params.append("seed_tracks", track);
    }

    params.append("limit", limit.toString());

    return (await fetchSpotify(`recommendations?${params}`)).tracks.map((t: any) => formatSong(t));
}
