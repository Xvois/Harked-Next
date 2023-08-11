import {disableAutoCancel, enableAutoCancel} from "@/database_functions/utilities";
import {Artist, Datapoint, Song, Term} from "@/interfaces/DatabaseInterfaces";
import {formatArtist, formatDatapoint, formatSong} from "@/database_functions/format";
import {retrieveLoggedUserID, retrieveUser} from "@/database_functions/users";
import {isLoggedIn} from "@/utility_functions/utilities";
import {fetchPBFirstData, fetchPBFullList} from "@/database_functions/fetch";
import {fetchSpotify} from "@/utility_functions/fetch";
import {batchAnalytics, batchArtists} from "@/spotify_functions/spotify";
import {User} from "@/interfaces/UserInterfaces";
import {artistsToRefIDs, genresToRefIDs, songsToRefIDs} from "@/database_functions/resolve";
import {putPBData} from "@/database_functions/push";
import {calculateTopGenres} from "@/utility_functions/top_genres";


const validDPExists = async (user_id: string, term: Term) => {

    // Calculate the date of a week ago.
    const d = new Date();
    const WEEK_IN_MILLISECONDS = 6.048e+8;
    d.setMilliseconds(d.getMilliseconds() - WEEK_IN_MILLISECONDS);
    const filter = `created >= "${d.toISOString()}" && term="${term}" && owner.user_id = "${user_id}"`;

    return await fetchPBFirstData("datapoints", filter);
}

export const postDatapoint = async (datapoint: Omit<Datapoint, "id" | "created" | "modified">) => {
    console.info('Posting datapoint.')

    const valid_exists = await validDPExists((datapoint.owner as User).user_id, datapoint.term);
    // If a valid datapoint already exists, log a message and return without creating a new datapoint.
    if (!!valid_exists) {
        console.info("Attempted to post new datapoint, but valid already exists.");
        console.info(valid_exists)
        return;
    }

    // Convert top genres, songs, artists and the owner to their respective IDs.
    console.time('artistsToRefIDs');
    await artistsToRefIDs(datapoint.top_artists as Artist[]).then(ids => datapoint.top_artists = ids);
    console.timeEnd('artistsToRefIDs');
    console.time('songsToRefIDs');
    await songsToRefIDs(datapoint.top_songs as Song[]).then(ids => datapoint.top_songs = ids);
    console.timeEnd('songsToRefIDs');
    console.time('genresToRefIDs');
    await genresToRefIDs(datapoint.top_genres).then(ids => datapoint.top_genres = ids);
    console.timeEnd('genresToRefIDs');
    datapoint.owner = (datapoint.owner as User).id;

    // Log the datapoint being posted.
    console.log(datapoint);

    await putPBData("datapoints", datapoint);
}

/**
 * Creates a datapoint for each term for the logged-in user and posts them
 * to the database using postDatapoint
 *
 * **The hydration will optimistically return the datapoints prior to
 * posting.**
 * @returns {[short_term : Datapoint, medium_term : Datapoint, long_term : Datapoint]}
 */
export const hydrateDatapoints = async function (){
    console.time("Hydration."); // Start a timer for performance measurement
    console.time("Compilation")
    const terms: Term[] = ['short_term', 'medium_term', 'long_term'];
    const loggedUserID = await retrieveLoggedUserID();
    const loggedUser = await retrieveUser(loggedUserID);
    const datapoints = [];

    const artist_cache: Record<string, Artist> = {};

    for (const term of terms) {
        console.info("Hydrating: " + term);
        let datapoint = {
            owner: loggedUser,
            term: term,
            top_songs: [],
            top_artists: [],
            top_genres: [],
        } as Omit<Datapoint, "id" | "created" | "modified">;
        let top_songs;
        let top_artists;

        // Queue up promises for fetching top songs and top artists
        let result = await Promise.all([fetchSpotify(`me/top/tracks?time_range=${term}&limit=50`), fetchSpotify(`me/top/artists?time_range=${term}&limit=50`)]);
        top_songs = result[0].items;
        top_artists = result[1].items;

        // Add all the songs
        datapoint.top_songs = top_songs.map((s: any) => formatSong(s)) as Song[];
        await batchAnalytics(datapoint.top_songs).then(res =>
            (datapoint.top_songs as Song[]).map((e, i) =>
                e.analytics = res[i]
            )
        );

        // Add all the artists
        datapoint.top_artists = top_artists.map((a: any) => formatArtist(a)) as Artist[];
        // Add artists to artist cache.
        top_artists.forEach((a: Artist) => artist_cache[a.artist_id] = a);

        datapoint.top_genres = calculateTopGenres(top_artists);

        // Add genres and images to artists in songs
        const unresolvedIDs: any[] = [];
        datapoint.top_songs.forEach(s => {
            (s.artists as Artist[]).forEach(a => {
                if (!artist_cache[a.artist_id]) {
                    unresolvedIDs.push(a.artist_id);
                }
            })
        });
        if (unresolvedIDs.length > 0) {
            const resolvedArtists = await batchArtists(unresolvedIDs);
            resolvedArtists.forEach(a => artist_cache[a.artist_id] = a);
        }
        for (let song of datapoint.top_songs) {
            song.artists = (song.artists as Artist[]).map(a => artist_cache[a.artist_id]);
        }
        datapoints.push(datapoint);
    }
    console.timeEnd("Compilation");
    console.info("Posting datapoints...");
    // Create deep copy clone to prevent optimistic return
    // resolving in to references via the API
    let postClone = structuredClone(datapoints);
    postHydration(postClone).then(() => {
        console.info("Hydration over.");
        console.timeEnd("Hydration."); // End the timer and display the elapsed time
    });
    return datapoints;
};

const postHydration = async (datapoints: Omit<Datapoint, "id" | "created" | "modified">[]) => {
    for (const datapoint of datapoints) {
        await postDatapoint(datapoint).then(() => {
            console.info(datapoint.term + " success!");
        });
    }
}

/**
 * Returns a valid datapoint for a given user in a given term.
 * If the function does not get a valid datapoint from the database, it will hydrate the user's datapoints
 * and return a valid one from that selection.
 * @param user_id
 * @param term [short_term, medium_term, long_term]
 * @returns {Promise<*>} A datapoint object.
 */
export const retrieveDatapoint = async function (user_id: string, term: Term): Promise<Datapoint | null> {
    let datapoint: Datapoint | null = null;
    let isOwn = false;

    if (isLoggedIn()) {
        const loggedID = await retrieveLoggedUserID();
        isOwn = loggedID === user_id;
    }

    // Set up the filter.
    let filter;
    if (isOwn) {
        const WEEK_IN_MILLISECONDS = 6.048e+8;
        // Calculate the start boundary time.
        const d1 = new Date();
        d1.setMilliseconds(d1.getMilliseconds() - WEEK_IN_MILLISECONDS);
        // Calculate the end boundary time.
        const d2 = new Date();
        d2.setMilliseconds(d2.getMilliseconds());
        filter = `owner.user_id="${user_id}"&&term="${term}"&&created>="${d1.toISOString()}"&&created<="${d2.toISOString()}"`;
    } else {
        filter = `owner.user_id="${user_id}"&&term="${term}"`;
    }

    const expand = 'top_songs,top_artists,top_genres,top_artists.genres,top_songs.artists,top_songs.artists.genres';
    const sort = '-created';

    const result = await fetchPBFirstData<Datapoint | undefined>('datapoints', filter, sort, expand);

    if (isOwn && result === undefined) {
        hydrateDatapoints();
    } else {
        datapoint = formatDatapoint(result);
    }

    return datapoint;
}
export const retrievePrevDatapoint = async function (user_id: string, term: Term) {
    const expand = 'top_songs,top_artists,top_genres,top_artists.genres,top_songs.artists,top_songs.artists.genres';
    const filter = `owner.user_id="${user_id}"&&term="${term}"`;
    const sort = '-created';
    const datapoint: Datapoint = (await fetchPBFullList<Datapoint>("datapoints", filter, sort))[1];
    if (datapoint === undefined) {
        return null
    } else {
        return formatDatapoint(datapoint);
    }
}
export const retrieveAllDatapoints = async function (user_id: string) {
    disableAutoCancel();

    const validExists = await validDPExists(user_id, 'long_term');
    const terms: Term[] = ['short_term', 'medium_term', 'long_term'];
    let datapoints = [];

    if (isLoggedIn() && user_id === await retrieveLoggedUserID() && validExists) {
        // Retrieve datapoints for each term
        for (const term of terms) {
            const datapoint = await retrieveDatapoint(user_id, term);
            datapoints.push(datapoint);
        }
    } else if (isLoggedIn() && user_id === await retrieveLoggedUserID() && !validExists) {
        // Hydrate datapoints
        datapoints = await hydrateDatapoints();
    } else {
        // Retrieve datapoints for each term
        for (const term of terms) {
            const datapoint = await retrieveDatapoint(user_id, term);
            datapoints.push(datapoint);
        }
    }


    enableAutoCancel();

    return datapoints;
};
export const retrievePrevAllDatapoints = async function (user_id: string) {

    disableAutoCancel();
    // Hate this
    const terms: Array<Term> = ["short_term", "medium_term", "long_term"];
    const datapoints = [];

    for (const term of terms) {
        const datapoint = await retrievePrevDatapoint(user_id, term);
        datapoints.push(datapoint);
    }
    enableAutoCancel();

    return datapoints;
};
