"use client"

import {useEffect, useState} from "react";
import {Artist} from "@/interfaces/DatabaseInterfaces";
import {Playlist} from "@/interfaces/SpotifyInterfaces";
import {getAverageAnalytics, getLIName, getTopInterestingAnalytics} from "@/analysis_functions/general";
import {translateAnalytics, translateAnalyticsLow} from "@/analysis_functions/constants";
import {followingContentsSearch} from "@/database_functions/user_meta";
import {getAlbumsWithTracks} from "@/spotify_functions/spotify";

const ArtistAnalysis = (props : {
    user_id: string,
    artist: Artist,
    playlists: Playlist[],
    term: "short_term" | "medium_term" | "long_term",
    isOwnPage: boolean
}) => {
    const {user_id, artist, playlists, term, isOwnPage} = props;

    const [artistsAlbumsWithLikedSongs, setArtistsAlbumsWithLikedSongs] = useState(null);
    const [followingWithArtist, setFollowingWithArtist] = useState(null);
    const [orderedAlbums, setOrderedAlbums] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [showing, setShowing] = useState("albums");

    const switchShowing = () => {
        if (showing === "albums") {
            setShowing("following");
        } else if (showing === "following") {
            setShowing("albums");
        } else {
            console.warn("ArtistAnalysis 'showing' is invalid: ", showing);
        }
    }

    useEffect(() => {
        const tracks = playlists.map(e => e.tracks).flat(1);
        getAlbumsWithTracks(artist.artist_id, tracks).then(
            result => {
                setArtistsAlbumsWithLikedSongs(result);
                setOrderedAlbums(result.sort((a, b) => b.saved_songs.length - a.saved_songs.length).slice(0, 4));
                if (result.length === 0 && isOwnPage) {
                    setShowing("following")
                }
            }
        );
        if (isOwnPage) {
            followingContentsSearch(user_id, artist, "artists", term).then(
                result => {
                    setFollowingWithArtist(result);
                    if (result.length === 0) {
                        setShowing("albums")
                    }
                }
            )
        }
    }, [playlists])

    useEffect(() => {
        if (isOwnPage) {
            setIsReady(followingWithArtist && artistsAlbumsWithLikedSongs);
        } else {
            setIsReady(!!artistsAlbumsWithLikedSongs);
        }
    }, [followingWithArtist, artistsAlbumsWithLikedSongs])

    return (
        <div className={`list-widget-wrapper`}>
            {isReady ?
                showing === "albums" ?
                    <>
                        <div className={'widget-item'} style={{flexGrow: '0', height: '75px'}}>
                            <div className={'widget-button'} onClick={() => {
                                if (isOwnPage) {
                                    switchShowing()
                                }
                            }}>
                                <p style={{margin: 0}}>Most listened to albums by</p>
                                <h3 style={{margin: 0}}>{getLIName(artist)}</h3>
                            </div>
                        </div>
                        {orderedAlbums.length > 0 ?
                            orderedAlbums.map((a, i) => {
                                return (
                                    <div key={getLIName(a)} className={'widget-item'}
                                         style={{animationDelay: `${i / 10}s`}}>
                                        <a href={a.link} className={'widget-button'}>
                                            <h4 style={{margin: 0}}>{getLIName(a)}</h4>
                                            <p style={{margin: 0}}>{a.saved_songs.length} saved
                                                song{a.saved_songs.length === 1 ? '' : 's'}</p>
                                        </a>
                                    </div>
                                )
                            })
                            :
                            <div className={'widget-item'} style={{animationDelay: `0.1s`}}>
                                <div className={'widget-button'}>
                                    <h4 style={{margin: 0}}>An analysis is not available.</h4>
                                    <p style={{margin: 0}}>No public playlists with this artist found on this
                                        profile.</p>
                                </div>
                            </div>
                        }
                    </>
                    :
                    <>
                        <div className={'widget-item'} style={{flexGrow: '0', height: '75px'}}>
                            <div className={'widget-button'} onClick={switchShowing}>
                                <p style={{margin: 0}}>Following that listen to</p>
                                <h3 style={{margin: 0}}>{getLIName(artist)}</h3>
                            </div>
                        </div>
                        {followingWithArtist.length > 0 ?
                            followingWithArtist.map((u, i) => {
                                return (
                                    <div key={u.user_id} className={'widget-item'}
                                         style={{animationDelay: `${i / 10}s`}}>
                                        <a href={`/profile/${u.user_id}`} className={'widget-button'}>
                                            <h4 style={{margin: 0}}>{u.username}</h4>
                                        </a>
                                    </div>
                                )
                            })
                            :
                            <div className={'widget-item'} style={{animationDelay: `0.1s`}}>
                                <div className={'widget-button'}>
                                    <h4 style={{margin: 0}}>No following listen to ths artist.</h4>
                                    <p style={{margin: 0}}>Try following more people for them to come up here.</p>
                                </div>
                            </div>
                        }
                    </>
                :
                <div className={'placeholder'} style={{width: '100%', height: '100%'}}/>
            }
        </div>
    )
}
const SongAnalysis = (props) => {
    const {song, averageAnalytics} = props;
    const includedKeys = getTopInterestingAnalytics(averageAnalytics, 3);
    if (song.hasOwnProperty("song_id")) {
        const analytics = song.analytics;
        if (!!analytics) {
            return (
                <div className={'list-widget-wrapper'}>
                    <div className={'widget-item'} style={{flexGrow: '0', height: '75px'}}>
                        <div className={'widget-button'}>
                            <p style={{margin: 0}}>Analysis of</p>
                            <h3 style={{margin: 0}}>{getLIName(song)}</h3>
                        </div>
                    </div>
                    {
                        Object.keys(translateAnalytics).map(function (key) {
                            if (includedKeys.findIndex(e => e === key) !== -1) {
                                const rawAnalytic = analytics[key];
                                const translated = rawAnalytic < 0.3 ? translateAnalyticsLow[key] : translateAnalytics[key];
                                const val = rawAnalytic < 0.3 ? 1 - rawAnalytic : rawAnalytic;
                                const shadow = rawAnalytic < 0.3 ? 1 - averageAnalytics[key] : averageAnalytics[key];
                                return (
                                    <div key={key} className={'widget-item'}>
                                        <div style={{transform: `scale(${206 / 221})`, padding: '15px'}}>
                                            <StatBlock name={translated.name}
                                                       description={translated.description}
                                                       value={val * 100} alignment={'left'}
                                                       shadow={shadow * 100}/>
                                        </div>
                                    </div>
                                )
                            }
                        })
                    }
                </div>
            )
        }
    }
}

const SongAnalysisAverage = (props) => {
    const {selectedDatapoint} = props;
    const average = getAverageAnalytics(selectedDatapoint.top_songs);
    return (
        <div className={'block-wrapper'} id={'song-analysis_functions-average'}>
            {Object.keys(translateAnalytics).map(function (key) {
                if (key !== "loudness") {
                    return <StatBlock key={key} name={translateAnalytics[key].name}
                                      description={translateAnalytics[key].description}
                                      value={average ? (key === 'tempo' ? 100 * (average[key] - 50) / 150 : average[key] * 100) : average[key] * 100}/>
                }
            })}
        </div>
    )
}

const TopSongsOfArtists = (props) => {
    const {selectedDatapoint, number} = props;
    return (
        <div className={'block-wrapper'}>
            {selectedDatapoint.top_artists.slice(0, number).map((artist) => {
                const topSongIndex = selectedDatapoint.top_songs.findIndex(s => s.artists.some(a => a.artist_id === artist.artist_id));
                if (topSongIndex > -1) {
                    return (
                        <div key={artist.artist_id} className={'stat-block'}
                             style={{
                                 padding: '15px',
                                 background: 'var(--transparent-colour)',
                                 border: '1px solid rgba(125, 125, 125, 0.5)'
                             }}>
                            <h3 style={{margin: '0'}}>{selectedDatapoint.top_songs[topSongIndex].title}</h3>
                            <p style={{margin: '0'}}>{artist.name}</p>
                        </div>
                    )
                }
            })}
        </div>
    )
}