import {Followers, Following, User} from "@/interfaces/UserInterfaces";
import {Artist, Datapoint, Settings, Song} from "@/interfaces/DatabaseInterfaces";
import {hashString} from "@/functions/utility_functions/utilities";
import {fetchPBData, fetchPBDataByID} from "@/functions/database_functions/fetch";
import {containsElement} from "@/functions/analysis_functions/comparisons";
import {retrieveAllDatapoints} from "@/functions/database_functions/datapoints";
import {updatePBData} from "@/functions/database_functions/push";
import {retrieveUser} from "@/functions/database_functions/users";
import {createEvent} from "@/functions/database_functions/events";

export const followsUser = async function (primaryUserID: string, targetUserID: string) {
    // If both are the same we can simply return false as a user cannot follow themselves.
    if (primaryUserID === targetUserID) {
        return false;
    }
    let follows = false;
    const targetUser = await retrieveUser(targetUserID);
    if (!targetUser) {
        console.warn('Null value returned from followsUser.');
        return null;
    }
    // Get who the primary user follows
    await fetchPBData("user_following", `user.user_id="${primaryUserID}"`)
        .then((res: Following[]) => {
            const item = res[0];
            // Check if the record id of the target user is held in the array of
            // the primary user's following array
            if (item.following.some((e) => e === targetUser.id)) {
                follows = true;
            }
        });
    return follows;
}
/**
 * Will make the primary user follow the target user.
 *
 * **Has a built-in event creation side effect.**
 * @param primaryUserID
 * @param targetUserID
 */
export const followUser = async function (primaryUserID: string, targetUserID: string) {
    if (await followsUser(primaryUserID, targetUserID)) {
        return;
    }

    const primaryObj = await fetchPBDataByID("user_following", hashString(primaryUserID));
    const targetObj = await fetchPBDataByID("user_following", hashString(targetUserID));

    if (!primaryObj.following.includes(targetObj.user)) {
        primaryObj.following.push(targetObj.user);
        await updatePBData("user_following", primaryObj, primaryObj.id);

        const targetUser = await retrieveUser(targetUserID);
        await createEvent(52, primaryUserID, targetUser, "users");

        const targetFollowers = await fetchPBDataByID("user_followers", hashString(targetUserID));
        targetFollowers.followers.push(primaryObj.user);
        await updatePBData("user_followers", targetFollowers, targetFollowers.id);
    }
}

/**
 * Will make the primary user unfollow the target user.
 * @param primaryUserID
 * @param targetUserID
 */
export const unfollowUser = async function (primaryUserID: string, targetUserID: string) {
    const primaryObj = await fetchPBDataByID("user_following", hashString(primaryUserID));
    const targetObj = await fetchPBDataByID("user_following", hashString(targetUserID));

    if (primaryObj.following.includes(targetObj.user)) {
        primaryObj.following = primaryObj.following.filter((e: string) => e !== targetObj.user);
        await updatePBData("user_following", primaryObj, primaryObj.id);

        const targetFollowers = await fetchPBDataByID("user_followers", hashString(targetUserID));
        targetFollowers.followers = targetFollowers.followers.filter((e: string) => e !== primaryObj.user);
        await updatePBData("user_followers", targetFollowers, targetFollowers.id);
    }
}

/**
 * Returns the user records of the followers of the target.
 * @param user_id
 * @returns {Array<User>}
 */
export const retrieveFollowers = async function (user_id: string) {
    const res: Followers = await fetchPBDataByID("user_followers", hashString(user_id), "followers");
    if (res.followers.length > 0) {
        return res.expand.followers;
    } else {
        return [];
    }
}
/**
 * Returns the user records who the target is following.
 * @param user_id
 * @returns {Array<User>}
 */
export const retrieveFollowing = async function (user_id: string) {
    console.log('retrieveFollowing called!')
    const res: Following = await fetchPBDataByID("user_following", hashString(user_id), "following");
    if (res.following.length > 0) {
        return res.expand.following;
    } else {
        return [];
    }
}
/**
 * Returns the settings of the target user.
 * @param user_id
 * @returns {Settings}
 */
export const retrieveSettings = async function (user_id: string) {
    const id: string = hashString(user_id);
    const res: Settings = await fetchPBDataByID("settings", id);
    return res;
}
/**
 * Modifies the settings of the target user.
 * @param user_id
 * @param new_settings : Settings
 */
export const changeSettings = async function (user_id: string, new_settings: Settings) {
    const id = hashString(user_id);
    await updatePBData("settings", new_settings, id);
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
 * Returns all the users that have a matching item in their most recent datapoints.
 */
export const followingContentsSearch = async function (user_id: string, item: Artist | Song | string, type: 'artists' | 'songs' | 'genres') {
    const following: Array<User> = await retrieveFollowing(user_id);
    const dpPromises: Promise<Datapoint[]>[] = [];
    following.forEach((user: User) => {
        dpPromises.push(retrieveAllDatapoints(user.user_id));
    })
    let dps: Datapoint[] = (await Promise.all(dpPromises)).flat();
    dps = dps.flat().filter(d => d !== null);
    const ownerIDs = dps.filter(e => containsElement(item, e, type)).map(e => e.owner as string);
    return following.filter((e: User) => ownerIDs.some((id) => id === e.id));
}