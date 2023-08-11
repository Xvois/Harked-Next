import {Artist, Genre, Song} from "@/interfaces/DatabaseInterfaces";
import {fetchPBFullList} from "@/database_functions/fetch";

class DBCache {
    songs: Song[] = [];
    artists: Artist[] = [];
    genres: Genre[] = [];

    constructor() {
        this.init();
    }

    async init() {
        this.songs = await fetchPBFullList<Song>("songs");
        this.artists = await fetchPBFullList<Artist>("artists");
        this.genres = await fetchPBFullList<Genre>("genres");
    }

    addSong(song: Song) {
        this.songs.push(song);
    }

    addSongs(songs: Song[]) {
        this.songs.push(...songs);
    }

    addArtist(artist: Artist) {
        this.artists.push(artist);
    }

    addArtists(artists: Artist[]) {
        this.artists.push(...artists);
    }

    addGenre(genre: Genre) {
        this.genres.push(genre);
    }

    addGenres(genres: Genre[]) {
        this.genres.push(...genres);
    }
}

class DBCacheManager {
    private static instance: DBCache;

    static async getInstance(): Promise<DBCache> {
        if (!DBCacheManager.instance) {
            DBCacheManager.instance = new DBCache();
            await DBCacheManager.instance.init();
        }
        return DBCacheManager.instance;
    }
}

export default DBCacheManager;