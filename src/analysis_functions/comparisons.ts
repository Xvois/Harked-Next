import {VariantElement} from "@/interfaces/GlobalInterfaces";
import {Datapoint} from "@/interfaces/DatabaseInterfaces";
import {getAverageAnalytics} from "@/analysis_functions/general";

export const containsElement = function (e : VariantElement, dp : Datapoint, type : "artists" | "songs" | "genres") {
    let contains = false;
    switch (type) {
        case "artists":
            if (typeof e === "object" && "artist_id" in e) {
                contains = dp[`top_${type}`].some((element) => element.artist_id === e.artist_id);
            }
            break;
        case "songs":
            if (typeof e === "object" && "song_id" in e) {
                contains = dp[`top_${type}`].some((element) => element.song_id === e.song_id);
            }
            break;
        case "genres":
            contains = dp[`top_${type}`].some(element => element === e);
            break;
    }
    return contains;
}

export const getMatchingItems = (dp1 : Datapoint, dp2 : Datapoint, type : "artists" | "songs" | "genres") => {
    const matches : VariantElement[] = [];
    dp1[`top_${type}`].forEach(item => {
        if (containsElement(item, dp2, type)) {
            matches.push(item)
        }
    })
    return matches;
}
export const calculateSimilarity = (dp1 : Datapoint, dp2 : Datapoint) => {
    let artistsSimilarity = 0;
    let genresSimilarity = 0;
    const avgGenreListLength = Math.floor((dp1.top_genres.length + dp2.top_genres.length) / 2);
    let metricDelta = 0;
    let u0Metrics = getAverageAnalytics(dp1.top_songs);
    let u1Metrics = getAverageAnalytics(dp2.top_songs);
    let similarity;
    dp1.top_artists.forEach(artist1 => {
        if (dp2.top_artists.some(artist2 => artist2.name === artist1.name)) {
            artistsSimilarity++;
        }
    })
    dp1.top_genres.forEach((genre, i1) => {
        const i2 = dp2.top_genres.findIndex(e => e === genre);
        if (i2 !== -1) {
            const diff = Math.abs(i1 - i2);
            genresSimilarity += Math.abs(avgGenreListLength - diff) / avgGenreListLength;
        }
    })
    artistsSimilarity /= dp1.top_artists.length;
    genresSimilarity /= avgGenreListLength;
    genresSimilarity = Math.pow(genresSimilarity, 0.25);
    const excludedKeys = ['tempo', 'loudness'];
    for (const key in u0Metrics) {
        if (!excludedKeys.some(e => e === key)) {
            metricDelta += Math.abs((u0Metrics[key] as number) - (u1Metrics[key] as number));
        }
    }
    metricDelta /= (Object.entries(u0Metrics).length - excludedKeys.length);
    metricDelta = Math.sqrt(metricDelta);
    similarity = ((2 * genresSimilarity + artistsSimilarity + 2 * (1 - metricDelta)) / 4);
    similarity = Math.round(100 * similarity)
    if (similarity > 100) {
        similarity = 100
    } // Ensure not over 100%
    return {
        artists: artistsSimilarity * 100,
        genres: genresSimilarity * 100,
        metrics: (1 - metricDelta) * 100,
        overall: similarity
    };
}

export const getItemIndexChange = function (item : VariantElement, index : number, type : "artists" | "songs" | "genres", comparisonDP : Datapoint) {
    let lastIndex = -1;
    switch (type) {
        case "artists":
            if (typeof item === "object" && "artist_id" in item) {
                lastIndex = comparisonDP[`top_${type}`].findIndex((element) => element.artist_id === item.artist_id);
            }
            break;
        case "songs":
            if (typeof item === "object" && "song_id" in item) {
                lastIndex = comparisonDP[`top_${type}`].findIndex((element) => element.song_id === item.song_id);
            }
            break;
        case "genres":
            if (typeof item === "string") {
                lastIndex = comparisonDP[`top_${type}`].indexOf(item);
            }
            break;
    }
    if (lastIndex < 0) {
        return null
    }
    //console.log(`----${item.name || item}----`);
    //console.log(`Prev: ${lastIndex}, New: ${index}, Diff: ${lastIndex - index}`);
    return lastIndex - index;
}