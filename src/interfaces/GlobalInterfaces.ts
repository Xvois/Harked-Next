import {Artist, Genre, Song} from "@/interfaces/DatabaseInterfaces";
import {Album} from "@/interfaces/SpotifyInterfaces";

export type VariantElement = Genre | string | Artist | Song | Album;