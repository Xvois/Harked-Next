import {User} from "@/interfaces/UserInterfaces";
import {hashString} from "@/functions/utility_functions/utilities";
import {disableAutoCancel, enableAutoCancel} from "@/functions/database_functions/utilities";
import {fetchPBData, fetchPBDataByID, fetchPBFirstData, fetchPBFullList} from "@/functions/database_functions/fetch";
import {fetchSpotify} from "@/functions/utility_functions/fetch";
import {Settings} from "http2";
import {deletePBData} from "@/functions/database_functions/push";

/**
 * Returns whether a user exists in the database.
 * @param user_id
 * @returns boolean
 */
export const userExists = async function (user_id: string) {
    return !!(await retrieveUser(user_id));
}
/**
 * Returns the profile data of the target user.
 * @param user_id
 * @returns ProfileData
 */
export const retrieveProfileData = async function (user_id: string) {
    const id = hashString(user_id);
    return await fetchPBDataByID("profile_data", id);
}
/**
 * Returns all the users currently in the database.
 * @returns {Promise<Array<User>>}
 */
export const retrieveAllUsers = async function () {
    disableAutoCancel();
    const users = await fetchPBFullList("users");
    enableAutoCancel();
    return users;
}
/**
 * Returns all the users that have public profiles currently in the database.
 * @returns {Promise<Array<User>>}
 */
export const retrieveAllPublicUsers = async function () {
    disableAutoCancel();
    let users: Record<string, User>[] = await fetchPBFullList("users");
    const settings: Record<string, Settings>[] = await fetchPBFullList("settings");
    users = users.filter(u => settings.some(s => s.user === u.id && s.public));
    enableAutoCancel();
    return users;
}
// TODO: FIX THIS
/**
 * Mapping of getUser with caching.
 * @param user_id
 * @returns User
 */
export const retrieveUser = async function (user_id: string) {
    return (await fetchPBFirstData('users', `user_id="${user_id}"`)) as unknown as User;
};
export const deleteUser = async (user_id: string) => {
    const universal_id = hashString(user_id);
    const datapoints = await fetchPBData('datapoints', `owner.user_id="${user_id}"`);
    const datapointPromises = datapoints.map(d => deletePBData('datapoints', d.id));
    await Promise.all(datapointPromises);
    const comments = await fetchPBData('comments', `user.user_id="${user_id}"`);
    const commentPromises = comments.map(c => deletePBData('comments', c.id));
    await Promise.all(commentPromises);
    const connectedRecordsPromises = [
        deletePBData("user_followers", universal_id),
        deletePBData("user_following", universal_id),
        deletePBData("settings", universal_id),
        deletePBData("profile_data", universal_id),
        deletePBData("comment_section", universal_id),
        deletePBData("profile_recommendations", universal_id),
    ]
    await Promise.all(connectedRecordsPromises);
    const user: User = await retrieveUser(user_id);
    await deletePBData('users', user.id);
}
export const retrieveLoggedUserID = async function () {
    const me = await fetchSpotify('me');
    return me.id;
};

