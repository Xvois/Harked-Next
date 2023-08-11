import {ShowcaseList} from "@/app/profile/Components/Showcase/ShowcaseList";
import {retrieveLoggedUserID, retrieveProfileData, retrieveUser} from "@/functions/database_functions/users";
import {retrieveFollowers, retrieveSettings} from "@/functions/database_functions/user_meta";
import {retrieveAllDatapoints, retrievePrevAllDatapoints} from "@/functions/database_functions/datapoints";
import {Datapoint, Term} from "@/interfaces/DatabaseInterfaces";
import {retrievePlaylists} from "@/functions/spotify_functions/spotify";
import {hashString, isLoggedIn} from "@/functions/utility_functions/utilities";
import {TopContainer} from "@/app/profile/Components/UserContainer";
import {PlaylistItemList} from "@/app/profile/Components/PlaylistDisplay";
import {LoginButton} from "@/shared_components/log_buttons";
import {SimpleInstance} from "@/shared_components/simple_instance";

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

    let terms: Array<Term | null> = ["short_term", "medium_term", "long_term"];

    if (allDatapoints.some((d: Datapoint) => d === null)) {
        for (let i = 0; terms.length < 3; i++) {
            if (allDatapoints[i] === null) {
                terms[i] = null;
            }
        }
    }
    if (!settings.public && pageID !== 'me') {
        console.info("LOCKED PAGE", settings);
    }

    return <div className='wrapper'>
        <TopContainer pageUser={pageUser} followers={followers}
                      isOwnPage={isOwnPage} isLoggedUserFollowing={false}
                      loggedUserID={loggedUserID} longTermDP={allDatapoints[2]} terms={terms}/>
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
            {/* Playlists */}
            <SimpleInstance possessive={possessive} title={"Playlists"} description={
                isLoggedIn() ?
                    <>
                        <p>A look at {possessive} public playlists, sorted by their number of songs.</p>
                    </>
                    :
                    <>
                        <p>Viewing someone&lsquo;s playlists requires being logged in.</p>
                        <LoginButton/>
                    </>
            }>
                {isLoggedIn() && playlists.length > 0 ?
                    <PlaylistItemList playlists={playlists}/>
                    :
                    <p style={{color: "var(--secondary-colour)", marginRight: 'auto'}}>
                        {playlists.length > 0 ? "Looks like there aren't any public playlists." : ""}
                    </p>
                }
            </SimpleInstance>

            {/* Recommendations */}
            <SimpleInstance possessive={possessive} title={"Recommendations"} description={
                isLoggedIn() ?
                    <>
                        <p><span style={{textTransform: 'capitalize'}}>{possessive}</span> artists
                            and songs that are recommended to others.</p>
                    </>
                    :
                    <>
                        <p>Viewing someone&lsquo;s recommendations requires being logged in.</p>
                        <LoginButton/>
                    </>
            }>
                {isLoggedIn() &&
                    <ProfileRecommendations pageGlobalUserID={pageGlobalUserID} isOwnPage={isOwnPage}/>
                }
            </SimpleInstance>

            {/* Reviews */}
            <SimpleInstance possessive={possessive} title={"Reviews"} description={
                isLoggedIn() ?
                    <>
                        <p>Have a look at {possessive} reviews on albums, artists and songs.</p>
                        <a className={'subtle-button'}
                           href={`/reviews/${pageUser.user_id}`}>View</a>
                    </>
                    :
                    <>
                        <p>Viewing someone&lsquo;s reviews requires being logged in.</p>
                        <LoginButton/>
                    </>
            }>
            </SimpleInstance>

            {/* Profile comments */}
            <SimpleInstance possessive={possessive} title={"Profile comments"} description={
                <p>See what other users have to say about {possessive} profile.</p>
            }>
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
            </SimpleInstance>
        </div>
    </div>

}