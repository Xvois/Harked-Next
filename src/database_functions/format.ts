import {Artist, Datapoint, Genre, Song} from "@/interfaces/DatabaseInterfaces";
import {Album, Playlist} from "@/interfaces/SpotifyInterfaces";
import {User} from "@/interfaces/UserInterfaces";

/**
 * Formats a spotify song in to a song object.
 * @param song
 * @returns Song
 */
export const formatSong = (song : any) => {
    let image = null;
    if (song.album.images !== undefined) {
        try {
            image = song.album.images[1].url
        } catch (e) {
            console.warn("Error formatting song: Image not found for ", song);
        }
    }
    let artists: Array<Artist> = song.artists.map((a : any) => formatArtist(a));
    return {
        song_id: song.id,
        title: song.name,
        artists: artists,
        image: image,
        link: song.external_urls.spotify,
    } as Song
}
/**
 * Formats a user object from spotify in to a formatted user object.
 * @returns User
 */
export const formatUser = function (user : any) {
    let pfp = null;
    if (user.images?.length > 0) {
        console.log(user);
        pfp = user.images[0].url;
    }
    return {
        user_id: user.id,
        username: user.display_name,
        profile_picture: pfp,
    } as User
}

/**
 * Formats a spotify album into an album object.
 * @param album
 * @returns Album
 */
export const formatAlbum = (album: any) => {
    let image = null;
    if (album.hasOwnProperty("images")) {
        if (album.images[1] !== undefined) {
            image = album.images[1].url;
        }
    }
    const artists = album.artists.map((a: any) => formatArtist(a));
    return {
        album_id: album.id,
        artists: artists,
        name: album.name,
        image: image,
        link: album.external_urls.spotify,
        saved_songs: album.saved_songs,
        tracks: album.tracks
    } as Album
}

/**
 * Formats a spotify artist in to an artist object.
 * @param artist
 * @returns Artist
 */
export const formatArtist = (artist: any) => {
    let image = null;
    if (artist.hasOwnProperty("images")) {
        if (artist.images[1] !== undefined) {
            image = artist.images[1].url
        }
    }
    return {
        artist_id: artist.id,
        name: artist.name,
        image: image,
        link: `https://open.spotify.com/artist/${artist.id}`,
        genres: artist.genres
    } as Artist
}

/**
 * Formats a spotify playlist into a playlist object.
 * @param playlist
 * @returns Playlist
 */
export const formatPlaylist = (playlist : any) => {
    let image = null;
    if (playlist.hasOwnProperty("images")) {
        if (playlist.images[0] !== undefined) {
            image = playlist.images[0].url;
        }
    }
    let tracks: any[] | undefined;
    if (playlist.hasOwnProperty("tracks")) {
        tracks = playlist.tracks;
    } else {
        tracks = undefined;
    }
    return {
        playlist_id: playlist.id,
        image: image,
        name: playlist.name,
        description: playlist.description,
        tracks: tracks,
        link: playlist.external_urls.spotify,
        followers: playlist.followers?.total,
        owner: formatUser(playlist.owner),
    } as Playlist
}
export const formatDatapoint = function (d: any) {
    if (d === null || d === undefined) {
        return null;
    }
    // Turn relation ids into the actual arrays / records themselves using
    // pocketbase's expand property
    d.top_artists = d.expand.top_artists;
    d.top_songs = d.expand.top_songs;
    d.top_genres = d.expand.top_genres.map((e : Genre) => e.genre);
    d.top_artists.map((e: Artist) => e.genres = e.expand.genres?.map((g: Genre) => g.genre));
    d.top_songs.map((e: Song) => e.artists = (e.expand.artists as Artist[]));
    d.top_songs.map((e: Song) => (e.artists as Artist[]).map(a => a.genres = a.expand.genres?.map((g: Genre) => g.genre)));
    // Delete redundant expansions
    delete d.expand;
    d.top_artists.forEach((e: Artist) => delete e.expand);
    d.top_songs.forEach((e: Song) => delete e.expand);
    d.top_songs.forEach((e: Song) => (e.artists as Artist[]).forEach(a => delete a.expand));
    return d as Datapoint;
};