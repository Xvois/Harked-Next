import {Album} from "@/interfaces/SpotifyInterfaces";
import {formatAlbum} from "@/database_functions/format";
import {fetchSpotify} from "@/utility_functions/fetch";
import {Artist, DBRecord, Genre, Song} from "@/interfaces/DatabaseInterfaces";
import {fetchPBDataByID} from "@/database_functions/fetch";

export function hashString(inputString : string) {
    let hash = 0; // Use regular integer
    if (inputString.length === 0) {
        return '0000000000000000';
    }
    for (let i = 0; i < inputString.length; i++) {
        const charCode = inputString.charCodeAt(i);
        hash = ((hash << 5) - hash) + charCode;
        // Convert to 64-bit integer by taking modulo of a large prime
        hash = hash & 0xFFFFFFFFFFFFFFFF;
    }
    const hex = hash.toString(16);
    return hex.padStart(16, '0').substring(0, 16);
}


export const handleCacheReset = () => {
    if ('caches' in window) {
        const cacheTypes = ['datapoints'];
        cacheTypes.forEach(t => {
            caches.delete(t).then(success => {
                if (success) {
                    console.log(`Cache ${t} has been cleared.`);
                } else {
                    console.log(`Cache ${t} does not exist.`);
                }
            }).catch(error => {
                console.error(`Error while clearing cache ${t}: ${error}`);
            });
        })
    } else {
        console.warn('The caches API is not supported in this browser.');
    }
}

// TOO LAZY FOR TYPES HERE, IT WOULD BE COMPLICATED WITH KEEPING THE OBJECT
// REFERENCE THE SAME

/**
 * This function will resolve the items in an array of records with
 * item objects in them. It works directly off the object references so returns
 * nothing.
 * @param itemRecords
 */
export const resolveItems = async (itemRecords : any[]) => {
    const resolveAlbums = async (reviewBatch : any[]) => {
        const albumIds = reviewBatch
            .filter((e) => e.item.type === "albums")
            .map((e) => e.item.id);

        // Batch process albums if there are any to fetch
        if (albumIds.length > 0) {
            const batchSize = 20;
            for (let i = 0; i < albumIds.length; i += batchSize) {
                const batchIds = albumIds.slice(i, i + batchSize);
                const albums: Album[] = (await fetchSpotify(`albums?ids=${batchIds.join(",")}`)).albums;
                for (const e of reviewBatch) {
                    if (e.item.type === "albums") {
                        let album = albums.find((a) => a.id === e.item.id);
                        if (album) {
                            album = formatAlbum(album);
                            e.item = album;
                        }
                    }
                }
            }
        }
    };

    for (let i = 0; i < itemRecords.length; i++) {
        let e = itemRecords[i];
        if (e.item.type === "artists") {
            let artist: Artist = await fetchPBDataByID("artists", e.item.id, "genres");
            artist.genres = artist.expand.genres as Genre[];
            if (artist.genres !== undefined) {
                artist.genres = artist.genres.map((e) => e.genre) as string[];
            }
            e.item = artist;
        } else if (e.item.type === "songs") {
            let song: Song = await fetchPBDataByID("songs", e.item.id, "artists");
            song.artists = song.expand.artists;
            e.item = song;
        } else if (e.item.type === "albums") {
            // Albums will be resolved in the batch process
        } else {
            throw new Error("Unknown type fetched from reviews.");
        }
    }

    // Resolve albums in the end to ensure all the batches are processed
    await resolveAlbums(itemRecords);
}

export const milliToHighestOrder = function (milliseconds : number) {
    let calcVal = milliseconds / 1000;
    let unit = 's';
    // Minutes
    if (calcVal > 60) {
        calcVal /= 60;
        unit = 'm';
        // Hours
        if (calcVal > 60) {
            calcVal /= 60;
            unit = Math.trunc(calcVal) !== 1 ? 'hrs' : 'hr';
            // Days
            if (calcVal > 24) {
                calcVal /= 24;
                unit = 'd';
                // Weeks
                if (calcVal > 7) {
                    calcVal /= 7;
                    unit = 'w';
                    // Months
                    if (calcVal > 30) {
                        calcVal /= 30;
                        unit = 'm';
                        // Years
                        if (calcVal > 12) {
                            calcVal /= 12;
                            unit = Math.trunc(calcVal) !== 1 ? 'yrs' : 'yr';
                        }
                    }
                }
            }
        }
    }
    return {
        value: Math.trunc(calcVal),
        unit: unit
    }
}

export function chunks(array : any[], size : number) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

export function getAllIndexes(arr : any[], val : any) {
    let indexes = [], i;
    for (i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

/**
 * Log an item to the console only in the dev environment.
 * @param item
 * @param type
 */
export function devLog(item: any, type: "log" | "info" | "warn" | "error" = "log") {
    if(process.env.NODE_ENV === "development") {
        console[type](item);
    }
}

// Utility function to get the value from a ref or return an empty string
export const getRefValueOrEmpty = (ref: React.RefObject<HTMLInputElement | null>): string => {
    return ref.current !== null && ref.current !== undefined ? ref.current.value : '';
};

export const isLoggedIn = () => {
    return false;
}