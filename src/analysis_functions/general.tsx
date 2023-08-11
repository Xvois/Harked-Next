import {Analytics, Artist, Datapoint, Song} from "@/interfaces/DatabaseInterfaces";
import {VariantElement} from "@/interfaces/GlobalInterfaces";
import {Album, Playlist} from "@/interfaces/SpotifyInterfaces";
import {translateAnalytics, translateAnalyticsLow} from "@/analysis_functions/constants";
import {User} from "@/interfaces/UserInterfaces";
import {JSX} from "react";

export const getLIName = function (data: VariantElement, maxLength = 30): string {
    let result: string;

    if (typeof data === "object") {
        if ("artist_id" in data && "name" in data) {
            result = (data as Artist).name;
        } else if ("song_id" in data && "title" in data) {
            result = (data as Song).title;
        } else if ("album_id" in data && "name" in data) {
            result = (data as Album).name;
        } else {
            throw new Error("getLIName failed.");
        }
    } else {
        result = data;
    }

    // Shorten the result if it exceeds maxLength
    if (result.length > maxLength) {
        result = result.substring(0, maxLength - 3) + "..."; // Subtract 3 to account for the ellipsis
    }

    return result;
};


export const getLIDescription = function (data: VariantElement, maxLength = 30): string {
    if (typeof data === "object") {
        if ("artist_id" in data && "genres" in data) {
            const artistGenres = (data as Artist).genres;
            if (artistGenres && artistGenres.length > 0) {
                return artistGenres[0].length > maxLength
                    ? artistGenres[0].substring(0, maxLength - 3) + "..."
                    : artistGenres[0];
            } else {
                return '';
            }
        }

        if (("song_id" in data || "album_id" in data) && "artists" in data) {
            const artistNames = (data as Song | Album).artists.map((e) => {
                if (typeof e === "object" && "name" in e) {
                    return e.name;
                } else {
                    console.warn("Unresolved Song or Album passed to getLIDescription!");
                    return '';
                }
            }).join(', ');

            return artistNames.length > maxLength
                ? artistNames.substring(0, maxLength - 3) + "..."
                : artistNames;
        }
    }

    return '';
};


function getMaxValueAttribute(attributes: Analytics) {
    const ignoredAttributes = ["key", "mode", "speechiness", "duration_ms", "time_signature", "tempo"];

    let max = Number.MIN_SAFE_INTEGER;
    let maxAttribute = '';

    for (const key in attributes) {
        if (typeof attributes[key] === 'number' && !ignoredAttributes.includes(key)) {
            let value = attributes[key] as number;
            if (value > max) {
                max = value;
                maxAttribute = key;
            }
        }
    }

    return maxAttribute;
}

function getMostInterestingAttribute(analytics: Analytics) {
    const ignoredAttributes = ["key", "mode", "duration_ms", "time_signature", "tempo", "loudness", "speechiness"];
    let max = Number.MIN_SAFE_INTEGER;
    let maxAnalytic: string | undefined;
    let min = Number.MAX_SAFE_INTEGER;
    let minAnalytic: string | undefined;

    for (const key in analytics) {
        if (typeof analytics[key] === "number" && !ignoredAttributes.includes(key)) {
            let value = analytics[key] as number;
            if (value > max) {
                max = value;
                maxAnalytic = key;
            }
            if (value < min) {
                // Having a vocal / studio recorded song is not interesting
                if (key !== "instrumentalness" && key !== "liveness") {
                    min = value;
                    minAnalytic = key;
                }
            }
        }
    }
    if (max === 0) {
        return null;
    }
    if ((max >= (1 - min) || max > 0.7) && maxAnalytic !== undefined) {
        return translateAnalytics[maxAnalytic];
    } else if ((max <= (1 - min) || min < 0.2) && minAnalytic) {
        return translateAnalyticsLow[minAnalytic]
    } else {
        return null;
    }
}

export const getTopInterestingAnalytics = (analytics: Analytics, number: number) => {
    let analyticsCopy = structuredClone(analytics);
    const intAnalytics = [];
    const ignoredAttributes = ["key", "mode", "duration_ms", "time_signature", "tempo", "loudness", "speechiness"];

    for (let i = 0; i < number; i++) {
        let max = Number.MIN_SAFE_INTEGER;
        let maxAnalytic;
        let min = Number.MAX_SAFE_INTEGER;
        let minAnalytic;

        for (const key in analyticsCopy) {
            if (typeof analyticsCopy[key] === 'number' && !ignoredAttributes.includes(key)) {
                let value = analyticsCopy[key] as number;
                if (value > max) {
                    max = value;
                    maxAnalytic = key;
                }
                if (value < min) {
                    // Having a vocal / studio recorded song is not interesting
                    if (key !== "instrumentalness" && key !== "liveness") {
                        min = value;
                        minAnalytic = key;
                    }
                }
            }
        }

        if (max >= (1 - min) && maxAnalytic) {
            intAnalytics.push(maxAnalytic);
            delete analyticsCopy[maxAnalytic];
        } else if (max <= (1 - min) && minAnalytic) {
            intAnalytics.push(minAnalytic);
            delete analyticsCopy[minAnalytic];
        }
    }

    return intAnalytics;
}

function getOrdinalSuffix(number: number) {
    const suffixes = ["th", "st", "nd", "rd"];
    const lastDigit = number % 10;
    const lastTwoDigits = number % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return "th";
    }

    return suffixes[lastDigit] || "th";
}

function getMostFittingGenre(song: Song) {
    const allGenres = song.artists.flatMap(artist => artist.genres || []);
    if (allGenres.length === 0) {
        return "obscure";
    }

    const genreCounts = allGenres.reduce((counts: any, genre) => {
        counts[genre] = (counts[genre] || 0) + 1;
        return counts;
    }, {});
    // Most frequent genre
    return Object.keys(genreCounts).reduce((a, b) => (genreCounts[a] > genreCounts[b] ? a : b));
}

function capitalize(input: string): string {
    if (input.length === 0) {
        return input; // Return the input string as-is if it's empty
    }

    const firstLetter = input[0].toUpperCase();
    const restOfTheString = input.slice(1);

    return firstLetter + restOfTheString;
}

export const getItemAnalysis = function (item: VariantElement, type: "artists" | "songs" | "genres", user: User, selectedDatapoint: Datapoint, allDatapoints: Datapoint[], term: "short_term" | "medium_term" | "long_term") {
    const regex = /\/profile\/(.+)/;
    // @ts-ignore
    const match = window.location.pathname.match(regex)[1];
    const possessive = match === 'me' ? 'your' : `${user.username}'s`;
    const pronoun = match === 'me' ? 'you' : `${user.username}`;
    const name = getLIName(item);
    switch (type) {
        case "artists":
            // Short to long term
            let indexes = allDatapoints.map(d => {
                return d?.top_artists.findIndex(a => a.artist_id === (item as Artist).artist_id);
            });
            // If any null datapoints, assume -1 index result
            indexes.map(i => i === null ? -1 : i);
            const associatedSongIndex = selectedDatapoint.top_songs.findIndex(s => s.artists.some(a => a.artist_id === (item as Artist).artist_id));
            const associatedSong = selectedDatapoint.top_songs[associatedSongIndex];
            const allSongs = selectedDatapoint.top_songs.filter(s => s.artists.some(a => a.artist_id === (item as Artist).artist_id));
            const avgAnalytics = getAverageAnalytics(allSongs);
            const intAttribute = getMostInterestingAttribute(avgAnalytics);

            // Construct first part of the analysis.
            let firstPartArtist;
            switch (term) {
                case "long_term":
                    // If they haven't listened to them at all in the last month
                    if (indexes[0] === -1) {
                        firstPartArtist = `${name} is still one of ${possessive} most listened to artists, although ${pronoun} has been listening to them significantly less than usual recently.`;

                    }
                    // If they have listened to less of them in the last month
                    else if (indexes[0] > indexes[2]) {
                        firstPartArtist = `${capitalize(pronoun)} ${pronoun === 'you' ? 'have' : 'has'} listened to ${name} less recently due to exploring new sounds and artists.`;
                    }
                    // If they have listened to the same or more of them in the last month
                    else {
                        firstPartArtist = `${capitalize(pronoun)} ${pronoun === 'you' ? 'have' : 'has'} been enjoying ${name}'s music more than ever before.`;
                    }
                    break;
                case "medium_term":
                    // If they haven't listened to them at all in the medium term
                    if (indexes[1] === -1) {
                        firstPartArtist = `${name} remains an influential figure in ${pronoun}'s recent music preferences, despite limited listening in the past 6 months.`;
                    }
                    // If they have listened to less of them in the medium term
                    else if (indexes[1] > indexes[2] && indexes[2] !== -1) {
                        firstPartArtist = `${capitalize(pronoun)} ${pronoun === 'you' ? 'have' : 'has'} listened to ${name} less than usual in the past 6 months, but it still holds a significant place in ${possessive} overall listening time.`;
                    }
                    // If they have listened to more of them in the medium term
                    else if (indexes[1] < indexes[2] && indexes[2] !== -1) {
                        firstPartArtist = `${capitalize(pronoun)} ${pronoun === 'you' ? 'have' : 'has'} been increasingly captivated by ${name}'s music in the past 6 months.`;
                    }
                    // If all indexes are the same
                    else if (indexes[0] === indexes[1] && indexes[1] === indexes[2]) {
                        firstPartArtist = `In the last 6 months, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} maintained a consistent listening pattern for ${name}'s music.`;
                    }
                    // If they have listened to more or less of them in the short term compared to the medium term
                    else if (indexes[0] !== indexes[1]) {
                        if (indexes[0] < indexes[1]) {
                            firstPartArtist = `In the last month, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} been listening to ${name} more frequently than in the previous 6 months.`;
                        } else {
                            firstPartArtist = `In the last month, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} explored other music, resulting in less time spent on ${name}'s tracks compared to the previous 6 months.`;
                        }
                    }

                    break;
                case "short_term":
                    // If this artist is totally new to them
                    if (indexes[2] === -1 && indexes[1] === -1) {
                        firstPartArtist = `In the last 4 weeks, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} shown a new interest in ${name}'s music.`;
                    }
                    // If they have listened to less of this artist in the last 4 weeks than usual
                    else if ((indexes[1] < indexes[0] && indexes[2] < indexes[0]) || (indexes[1] < indexes[0] && indexes[2] === -1)) {
                        firstPartArtist = `In the last 4 weeks, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} listened to ${name}'s music less frequently than before.`;
                    }
                    // If they have listened to more than usual in the last 6 months, and more than the last 6 months in the last 4 weeks
                    else if ((indexes[1] > indexes[0] && indexes[2] > indexes[1]) || (indexes[1] > indexes[0] && indexes[2] === -1)) {
                        firstPartArtist = `In the past 6 months and especially in the last 4 weeks, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} been increasingly captivated by ${name}'s music.`;
                    }
                    // If they have listened to less than the last 6 months average
                    else if (indexes[0] > indexes[1] && indexes[1] !== 1) {
                        firstPartArtist = `Compared to the previous 6 months, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} listened to ${name} less frequently in the last 4 weeks.`;
                    }
                    // If they have listened to more than the last 6 months average and they are not yet on the top artists list but they are on their way to be
                    else if (indexes[1] > indexes[0] && indexes[2] === -1) {
                        firstPartArtist = `In the last 4 weeks, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} been increasingly drawn to ${name}'s music.`;
                    }
                    // If both indexes[0] and indexes[2] are less than indexes[1]
                    else if (indexes[0] < indexes[1] && indexes[2] < indexes[1]) {
                        firstPartArtist = `In the last 4 weeks, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} experienced a renewed appreciation for ${name}'s music.`;
                    }
                    // If both indexes[0] and indexes[2] are greater than indexes[1]
                    else if (indexes[0] > indexes[1] && indexes[2] > indexes[1]) {
                        firstPartArtist = `In the last 4 weeks, ${pronoun}'s listening to ${name} has decreased compared to the previous 6 months, but it remains higher than the all-time average.`;
                    }
                    // If all indexes are the same
                    else if (indexes[0] === indexes[1] && indexes[1] === indexes[2]) {
                        firstPartArtist = `In the last 4 weeks, ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} maintained a consistent listening pattern for ${name}'s music.`;
                    }
                    // If indexes[0] and indexes[1] are equal but less than indexes[2]
                    else if (indexes[0] === indexes[1] && indexes[0] < indexes[2]) {
                        firstPartArtist = `Over the last 4 weeks and 6 months ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} been listening to ${name} consistently more than usual.`;
                    }
                    // If indexes[0] and indexes[1] are equal but less than indexes[2]
                    else if (indexes[0] === indexes[1] && indexes[0] > indexes[2]) {
                        firstPartArtist = `Over the last 4 weeks and 6 months ${pronoun} ${pronoun === 'you' ? 'have' : 'has'} been listening to ${name} consistently less than usual.`;
                    }
                    break;
            }
            // Construct the second part of the analysis
            let secondPartArtist;
            if (!!intAttribute && !!associatedSong) {
                secondPartArtist =
                    <span>The songs {pronoun} listen{pronoun !== 'you' && 's'} to by {name} are predominantly {intAttribute.name}, with {possessive} top song by them of {term === 'long_term' ? 'all time' : (term === 'medium_term' ? 'the last 6 months' : 'the last 4 weeks')} being <a
                        className={'heavy-link'}
                        href={associatedSong?.link}>{getLIName(associatedSong)}</a> at number {associatedSongIndex + 1}.</span>
            } else if (!intAttribute && !!associatedSong) {
                secondPartArtist =
                    <span>{capitalize(possessive)} top song by them of {term === 'long_term' ? 'all time' : (term === 'medium_term' ? 'the last 6 months' : 'the last 4 weeks')} being <a
                        className={'heavy-link'}
                        href={associatedSong?.link}>{getLIName(associatedSong)}</a> at number {associatedSongIndex + 1}.</span>
            }
            return (
                <p>
                    {firstPartArtist}
                    <br/>
                    <br/>
                    {secondPartArtist}
                </p>
            )
        case "songs":
            const hasAnalytics = "analytics" in (item as Song) && !((item as Song).analytics === null);
            let firstPartSong;
            if (hasAnalytics) {
                const song = item as Song;
                const analyticsCopy = song.analytics;
                const interestingAnalytics = getTopInterestingAnalytics(analyticsCopy, 2);

                const translated = interestingAnalytics
                    .map((a) => {
                        const analyticValue = analyticsCopy[a] as number;
                        const translationGroup = analyticValue > 0.3 ? translateAnalytics : translateAnalyticsLow;
                        return translationGroup[a].name;
                    })
                    .join(', ');

                const artistIndex = selectedDatapoint.top_artists.findIndex((a) => song.artists[0].artist_id === a.artist_id);
                const artistPosition = artistIndex !== -1 ? artistIndex + 1 : null;

                const firstPartSong = `This ${translated} song by ${getLIDescription(song)} is emblematic of ${possessive} love for ${getMostFittingGenre(song)} music.`;

                let secondPartSong = '';
                if (artistPosition) {
                    const artistName = getLIName(song.artists[0]);
                    const termDescription =
                        term === 'long_term' ? 'all time' : term === 'medium_term' ? 'the last 6 months' : 'the last 4 weeks';
                    secondPartSong = `${artistName} holds the ${artistPosition}${getOrdinalSuffix(artistPosition)} position in ${possessive} top artists of ${termDescription}.`;
                }

                return (
                    <p>
                        {firstPartSong}
                        <br/>
                        <br/>
                        {secondPartSong}
                    </p>
                );
            } else {
                firstPartSong = `The song hasn't been analyzed yet.`;
                return (
                    <p>
                        {firstPartSong}
                    </p>
                );
            }
        case "genres":
            const genreName = getLIName(item);

            // @ts-ignore
        function calculatePopularityTrend(genrePopularity: Array<number | null>): string {
            const validTrendValues = genrePopularity.filter(value => value !== null);

            if (validTrendValues.length >= 2) {
                const firstValue = validTrendValues[0];
                const lastValue = validTrendValues[validTrendValues.length - 1];

                if (lastValue && firstValue) {
                    if (lastValue > firstValue) {
                        return "increasing";
                    } else if (lastValue < firstValue) {
                        return "decreasing";
                    }
                }
            }

            return "consistent";
        }


            // Analyze the popularity of the genre across different terms
            const genrePopularity: Array<number | null> = allDatapoints.map(datapoint => {
                const genreIndex = datapoint?.top_genres.findIndex(genre => genre === item);
                return genreIndex !== -1 && genreIndex !== null ? genreIndex + 1 : null;
            });

            // Determine the trend of the genre's popularity
            const popularityTrend = calculatePopularityTrend(genrePopularity);

            let genreAnalysis = "";

            if (popularityTrend === "increasing") {
                genreAnalysis = `${capitalize(pronoun)} have been increasingly drawn to ${genreName} music over time, making it one of ${pronoun === 'you' ? 'your' : `${possessive}`} top genres of ${term === 'long_term' ? 'all time' : (term === 'medium_term' ? 'the last 6 months' : 'the last 4 weeks')}.`;
            } else if (popularityTrend === "decreasing") {
                genreAnalysis = `${capitalize(pronoun)} have been listening to ${genreName} music less frequently over time, but it still holds a significant place in ${pronoun === 'you' ? 'your' : `${possessive}`} overall music preferences.`;
            } else {
                genreAnalysis = `Although ${pronoun} may have experienced fluctuations in ${pronoun === 'you' ? 'your' : `${possessive}`} listening preferences for ${genreName} music over time, it remains an influential genre for ${pronoun === 'you' ? 'your' : `${possessive}`} music taste.`;
            }

            // Find the top artists associated with the genre
            const genreArtists = selectedDatapoint.top_artists.filter(artist => artist.genres?.some(genre => genre === item));

            const topArtistLinks = genreArtists.slice(0, 4).map((artist, index) => (
                <a key={artist.link + index} className="heavy-link" href={artist.link}>
                    {getLIName(artist)}<span
                    style={{fontWeight: 'normal'}}>{index !== genreArtists.length - 1 && index !== 3 && ', '}</span>
                </a>
            ));
            const remainingArtistCount = Math.max(0, genreArtists.length - 4);

            let artistAnalysis: JSX.Element = <></>;
            if (genreArtists.length > 0) {
                artistAnalysis =
                    <span>{pronoun === 'you' ? 'Your' : `${possessive}`} favorite artists in this genre include {topArtistLinks}{remainingArtistCount > 0 ? ` and ${remainingArtistCount} more.` : '.'}</span>;
            }

            return (
                <p>
                    {genreAnalysis}
                    <br/>
                    <br/>
                    {artistAnalysis}
                </p>
            );
        default:
            console.warn("updateFocusMessage error: No focus type found.")
    }
}

const regress = (x: number[], y: number[]) => {
    const n = y.length;
    let sx = 0;
    let sy = 0;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < n; i++) {
        sx += x[i];
        sy += y[i];
        sxy += x[i] * y[i];
        sxx += x[i] * x[i];
        syy += y[i] * y[i];
    }
    const mx = sx / n;
    const my = sy / n;
    const yy = n * syy - sy * sy;
    const xx = n * sxx - sx * sx;
    const xy = n * sxy - sx * sy;
    const slope = xy / xx;
    const intercept = my - slope * mx;
    const r = xy / Math.sqrt(xx * yy);
    const r2 = Math.pow(r, 2);
    let sst = 0;
    for (let i = 0; i < n; i++) {
        sst += Math.pow((y[i] - my), 2);
    }
    const sse = sst - r2 * sst;
    const see = Math.sqrt(sse / (n - 2));
    const ssr = sst - sse;
    return {slope, intercept, r, r2, sse, ssr, sst, sy, sx, see};
}

export const getPlaylistAnalysis = (tracks: Song[]) => {

    const avgAnalytics = getAverageAnalytics(tracks);

    /**
     * STANDARD DEVIATION CALCS
     **/

        // Calculate the sum of the squares of the differences of a track
        // to the average analytics
    const getSquaredAnalyticsDiff = (track: Song, avgAnalytics: Analytics) => {
            let rollingTotal = 0;
            for (const key of Object.keys(avgAnalytics)) {
                if (key !== "tempo" && key !== "loudness") {
                    rollingTotal += Math.pow(((track.analytics[key] as number) - (avgAnalytics[key] as number)), 2)
                }
            }
            return rollingTotal;
        }
    const tracksWithAnalytics = tracks.filter(t => t.hasOwnProperty("analytics") && t.analytics !== null);
    const playlistStandardDeviation = Math.sqrt(
        tracksWithAnalytics.reduce((accumulator, currentValue) => accumulator + getSquaredAnalyticsDiff(currentValue, avgAnalytics), 0) / tracksWithAnalytics.length
    );

    /**
     * LINEAR TENDENCIES CALCS
     *
     * TAKEN INTO ACCOUNT:
     * DECREASING (LINEARLY)
     * STEADY
     * INCREASING (LINEARLY)
     *
     **/
    const yVals = [];

    for (let i = 1; i <= tracksWithAnalytics.length; i++) {
        yVals.push(i);
    }

    let regressions: Record<string, number> = {
        acousticness: 0,
        danceability: 0,
        energy: 0,
        instrumentalness: 0,
        liveness: 0,
        valence: 0,
    }

    for (const key of Object.keys(regressions)) {
        const yValues = yVals.map(Number); // Convert yVals to an array of numbers
        const xValues = tracksWithAnalytics.map(t => Number(t.analytics[key])); // Convert analytics values to an array of numbers

        regressions[key] = regress(yValues, xValues).slope;
    }

    const notableTrends = [];
    for (const key of Object.keys(regressions)) {
        if (Math.abs(regressions[key]) > 0.1) {
            notableTrends.push(key);
        }
    }

    notableTrends.sort((a, b) => Math.abs(regressions[b]) - Math.abs(regressions[a]))

    /**
     * NOTABLE ANALYTICS CALCS
     **/

    const notableAnalytic = getMostInterestingAttribute(avgAnalytics);

    return {
        variability: playlistStandardDeviation,
        vibe: notableAnalytic?.name ?? null,
        trends: notableTrends.map(trend => {
            return {
                name: translateAnalytics[trend].name,
                slope: regressions[trend],
            };
        }),
    };
}

export const getItemType = (item: Artist | Song | Album | Playlist | User | string) => {
    if (item.hasOwnProperty('artist_id')) {
        return 'artists'
    } else if (item.hasOwnProperty('song_id')) {
        return 'songs'
    } else if (item.hasOwnProperty('album_id')) {
        return 'albums';
    } else if (item.hasOwnProperty('playlist_id')) {
        return 'playlists';
    } else if (item.hasOwnProperty('user_id')) {
        return 'users'
    } else if (typeof item !== "object") {
        return 'genres'
    } else {
        console.error(item);
        throw new Error('Unknown item submitted to getItemType.');
    }
}

export const getGenresRelatedArtists = (genre: string, artists: Artist[]) => {
    return artists.filter(a => a.genres ? a.genres.some(g => g === genre) : false)
}


export const getAverageAnalytics = function (songs: Song[]) {
    // noinspection SpellCheckingInspection
    let avgAnalytics: Record<string, number> = {
        acousticness: 0,
        danceability: 0,
        energy: 0,
        instrumentalness: 0,
        liveness: 0,
        loudness: 0,
        valence: 0,
        tempo: 0
    }
    const validSongs = songs.filter(s => s.hasOwnProperty("analytics") && s.analytics !== null);
    for (const song of validSongs) {
        Object.keys(translateAnalytics).forEach(key => {
            avgAnalytics[key] += (song.analytics[key] as number) / validSongs.length;
        })
    }
    return avgAnalytics as Analytics;
}