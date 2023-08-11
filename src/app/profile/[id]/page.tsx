import {ShowcaseList} from "@/app/profile/Components/Showcase/ShowcaseList";
import {retrieveLoggedUserID, retrieveProfileData, retrieveUser} from "@/database_functions/users";
import {retrieveFollowers, retrieveSettings} from "@/database_functions/user_meta";
import {retrieveAllDatapoints, retrievePrevAllDatapoints} from "@/database_functions/datapoints";
import {Datapoint} from "@/interfaces/DatabaseInterfaces";
import {retrievePlaylists} from "@/spotify_functions/spotify";
import {hashString, isLoggedIn} from "@/utility_functions/utilities";
import {TopContainer} from "@/app/profile/Components/UserContainer";
import {handleAlternateLogin} from "@/app/authentication/Functions/logins";
import {PlaylistItemList} from "@/app/profile/Components/PlaylistDisplay";

export default async function Page({params}: { params: { id: string } }) {
    const simpleDatapoints = ["artists", "songs", "genres"];
    const pageID = params.id;

    const pageUserPromise = retrieveUser(pageID);
    const followersPromise = retrieveFollowers(pageID);
    const allDpsPromise = retrieveAllDatapoints(pageID);
    const allPrevDatapointsPromise = retrievePrevAllDatapoints(pageID);
    const settingsPromise = retrieveSettings(pageID);
    const profileDataPromise = retrieveProfileData(pageID);
    const playlistsPromise = retrievePlaylists(pageID);

    const fetchingPromises = [pageUserPromise, followersPromise, allDpsPromise, allPrevDatapointsPromise, settingsPromise, profileDataPromise, playlistsPromise];

    const [pageUser, followers, allDatapoints, allPreviousDatapoints, settings, profileData, playlists] = await Promise.all(fetchingPromises);

    const loggedUserID = await retrieveLoggedUserID();
    const isOwnPage = loggedUserID ? (loggedUserID === pageUser.user_id) : false;
    const possessive = isOwnPage ? 'your' : pageUser.username + "'s";

    let terms: Array<string | null> = ["short_term", "medium_term", "long_term"];

    if (allDatapoints.some((d : Datapoint) => d === null)) {
        for (let i = 0; terms.length < 3; i++) {
            if (allDatapoints[i] === null) {
                terms[i] = null;
            }
        }
    }
    if (!settings.public && pageID !== 'me') {
        console.info("LOCKED PAGE", settings);
    }

    return (
        <div className='wrapper'>
            <TopContainer pageUser={pageUser} followers={followers}
                          isOwnPage={isOwnPage}
                          loggedUserID={loggedUserID} longTermDP={allDatapoints[2]} terms={terms} />
            <div className={'simple-wrapper'}>
                {simpleDatapoints.map(function (type) {
                    return (
                        <div key={type} className='simple-instance' style={{minWidth: '0px'}}>
                            <ShowcaseList start={0} end={9} {...{
                                pageUser,
                                playlists,
                                allDatapoints,
                                allPreviousDatapoints,
                                type,
                                terms,
                                isOwnPage
                            }}/>
                        </div>
                    )
                })}
                <div className={'simple-instance'} style={{alignItems: 'center'}}>
                    <div className={'section-header'}>
                        <div>
                            <p style={{
                                margin: '16px 0 0 0',
                                textTransform: 'uppercase'
                            }}>{possessive}</p>
                            <h2 style={{margin: '0', textTransform: 'uppercase'}}>Playlists</h2>
                            {isLoggedIn() ?
                                <>
                                    <p>A look at {possessive} public playlists, sorted by their number of
                                        songs.</p>
                                </>
                                :
                                <>
                                    <p>Viewing someone's playlists requires being logged in.</p>
                                    <button className={'subtle-button'} onClick={handleAlternateLogin}>Log-in
                                    </button>
                                </>
                            }
                        </div>
                    </div>
                    {!isLoggedIn() ?
                        <></>
                        :
                        playlists.length < 1 ?
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: '10px',
                                width: '100%'
                            }}>
                                <p style={{color: "var(--secondary-colour)", marginRight: 'auto'}}>Looks like
                                    there aren't any public playlists.</p>
                            </div>
                            :
                            <PlaylistItemList playlists={playlists}/>
                    }
                </div>
                <div className={'simple-instance'}>
                    <div className={'section-header'}>
                        <div style={{maxWidth: '400px'}}>
                            <p style={{
                                margin: '16px 0 0 0',
                                textTransform: 'uppercase'
                            }}>{possessive}</p>
                            <h2 style={{margin: '0', textTransform: 'uppercase'}}>Recommendations</h2>
                            {isLoggedIn() ?
                                <>
                                    <p><span style={{textTransform: 'capitalize'}}>{possessive}</span> artists
                                        and songs
                                        that are recommended to others.</p>
                                </>
                                :
                                <>
                                    <p>Viewing someone's recommendations requires being logged in.</p>
                                    <button className={'subtle-button'} onClick={handleAlternateLogin}>Log-in
                                    </button>
                                </>
                            }
                        </div>
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: '10px',
                        width: '100%'
                    }}>
                        {isLoggedIn() &&
                            <ProfileRecommendations pageGlobalUserID={pageGlobalUserID} isOwnPage={isOwnPage}/>
                        }
                    </div>
                </div>
                <div className={'simple-instance'}>
                    <div className={'section-header'}>
                        <div style={{maxWidth: '400px'}}>
                            <p style={{
                                margin: '16px 0 0 0',
                                textTransform: 'uppercase'
                            }}>{possessive}</p>
                            <h2 style={{margin: '0', textTransform: 'uppercase'}}>Reviews</h2>
                            {isLoggedIn() ?
                                <>
                                    <p>Have a look at {possessive} reviews on albums, artists and songs.</p>
                                    <a className={'subtle-button'}
                                       href={`/reviews/${pageUser.user_id}`}>View</a>
                                </>
                                :
                                <>
                                    <p>Viewing someone's reviews requires being logged in.</p>
                                    <button className={'subtle-button'} onClick={handleAlternateLogin}>Log-in
                                    </button>
                                </>
                            }
                        </div>
                    </div>
                </div>
                <div className={'simple-instance'}>
                    <div className={'section-header'}>
                        <div style={{maxWidth: '400px'}}>
                            <p style={{
                                margin: '16px 0 0 0',
                                textTransform: 'uppercase'
                            }}>{possessive}</p>
                            <h2 style={{margin: '0', textTransform: 'uppercase'}}>Profile comments</h2>
                            <p>See what other users have to say about {possessive} profile.</p>
                        </div>
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: '10px',
                        width: '100%'
                    }}>
                        <CommentSection sectionID={hashString(pageGlobalUserID)} owner={pageUser}
                                        isAdmin={isOwnPage}/>
                    </div>
                </div>
            </div>

        </div>
    )
}