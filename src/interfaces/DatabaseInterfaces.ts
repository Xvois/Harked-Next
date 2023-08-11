import {User} from "@/interfaces/UserInterfaces";
import {Album} from "@/interfaces/SpotifyInterfaces";

export interface DBRecord {
    id: string,
    created: string,
    modified: string,
    expand?: any
}

export interface Analytics {
    [key: string]: number | string;
    acousticness: number;
    analysis_url: string;
    danceability: number;
    duration_ms: number;
    energy: number;
    id: string;
    instrumentalness: number;
    key: number;
    liveness: number;
    loudness: number;
    mode: number;
    speechiness: number;
    tempo: number;
    time_signature: number;
    track_href: string;
    type: string;
    uri: string;
    valence: number;
}

export interface Genre extends DBRecord {
    genre: string
}

export interface Artist extends DBRecord {
    artist_id: string,
    name: string,
    image: string,
    link: string,
    genres: string[] | Genre[]
}

export interface Song extends DBRecord {
    song_id: string,
    title: string,
    artists: Artist[] | string[],
    link: string,
    image: string,
    analytics: Analytics
}

export type Term = "short_term" | "medium_term" | "long_term"

export interface Datapoint extends DBRecord {
    owner: User | string,
    term: Term,
    top_songs: Song[] | string[],
    top_artists: Artist[] | string[],
    top_genres: string[]
}

export interface Settings extends DBRecord {
    user: User | string,
    public: boolean
}

export interface UserEvent extends DBRecord {
    owner: User | string,
    ref_num: number
    item: { id: string, type: string } | Album | Artist | Song | User,
}

export interface PlaylistMetadata extends DBRecord {
    playlist_id: string,
    meta: Record<string, string>,
}

export type Type = "genres" | "artists" | "songs";