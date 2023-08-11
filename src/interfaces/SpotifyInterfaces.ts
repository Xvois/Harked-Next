import {Artist, Song} from "@/interfaces/DatabaseInterfaces";
import {User} from "@/interfaces/UserInterfaces";
// TODO: REFACTOR ALBUM INTERFACE
export interface Album {
    id: string;
    album_id: string,
    artists: Array<Artist>,
    name: string,
    tracks: Array<Song>,
    image: string,
    link: string,
    saved_songs?: Array<Song>
}

export interface Playlist {
    playlist_id: string,
    image: string,
    name: string,
    description: string,
    tracks: Array<Song>,
    link: string,
    followers: number
    owner: User
}