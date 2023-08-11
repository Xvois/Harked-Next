import {DBRecord} from "@/interfaces/DatabaseInterfaces";

export interface User extends DBRecord {
    user_id: string,
    username: string,
    profile_picture: string
}

export interface Following extends DBRecord {
    user: User | string,
    following: User[] | string[]
}

export interface Followers extends DBRecord {
    user: User | string,
    followers: User[] | string[]
}
