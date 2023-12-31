"use client"
import {useEffect, useState} from "react";
import {Playlist} from "@/interfaces/SpotifyInterfaces";
import {retrievePlaylistMetadata} from "@/functions/database_functions/playlists";
import {PlaylistMetadata} from "@/interfaces/DatabaseInterfaces";

export const PlaylistItemList = function(props: {playlists: Playlist[]}) {
    const {playlists} = props;

    const [listLength, setListLength] = useState(5);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '10px',
            width: '100%'
        }}>
            {playlists.slice(0, listLength).map(p => {
                return (
                    <PlaylistItem key={p.playlist_id} playlist={p}/>
                )
            })}
            {playlists.length > listLength ?
                <button onClick={() => {
                    setListLength(playlists.length)
                }} style={{width: '100%', border: '1px solid var(--secondary-colour)', padding: '10px'}}
                        className={'std-button'}>See more</button>
                :
                (
                    playlists.length > 5 ?
                        <button onClick={() => {
                            setListLength(5)
                        }} style={{width: '100%', border: '1px solid var(--secondary-colour)', padding: '10px'}}
                                className={'std-button'}>See less</button>
                        :
                        <></>
                )
            }
        </div>
    )
}

const PlaylistItem = function (props : {playlist: Playlist}) {
    const {playlist} = props;

    const [playlistMetadata, setPlaylistMetadata] = useState(null as unknown as PlaylistMetadata);

    useEffect(() => {
        if (playlist) {
            retrievePlaylistMetadata(playlist.playlist_id).then(res => setPlaylistMetadata(res));
        }
    }, [playlist])

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexGrow: '1',
            background: 'rgba(125, 125, 125, 0.1)',
            border: '1px solid rgba(125, 125, 125, 0.75)',
            padding: '10px',
            fontFamily: 'Inter Tight',
            width: 'max-content',
            gap: '15px'
        }}>
            {playlist.image && (
                <img style={{width: '100px', height: '100px', objectFit: 'cover'}} alt={'playlist'}
                     src={playlist.image}></img>
            )}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                color: 'var(--primary-colour)',
                flexGrow: '1',
                wordBreak: 'break-all'
            }}>
                <p style={{margin: '0 0 5px 0', fontWeight: '800'}}>{playlist.name}</p>
                <p style={{
                    margin: '0 0 5px 0',
                    borderBottom: '1px solid var(--secondary-colour)',
                }}>{playlist.description}</p>
                <p style={{
                    margin: '0',
                    opacity: '0.5'
                }}>{playlist.tracks.length} songs {playlistMetadata && `· ${Object.keys(playlistMetadata.meta).length} annotation${Object.keys(playlistMetadata.meta).length !== 1 ? 's' : ''}`}</p>
                <a href={`/playlist/${playlist.playlist_id}`} className={'subtle-button'}
                   style={{marginTop: 'auto', marginLeft: 'auto'}}>Explore</a>
            </div>
        </div>
    )
}