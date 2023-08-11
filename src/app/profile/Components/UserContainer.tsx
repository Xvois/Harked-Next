"use client" // TODO: FIGURE OUT A WAY TO MAKE THIS NOT CLIENT??

import {useEffect, useState} from "react";
import {retrieveDatapoint} from "@/database_functions/datapoints";

function ComparisonLink(props) {
    const {pageUser, loggedUserID, longTermDP, simple = false} = props;
    const [loggedDP, setLoggedDP] = useState(null);

    useEffect(() => {
        retrieveDatapoint(loggedUserID, "long_term").then(res => setLoggedDP(res));
    }, [])

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '15px',
            marginLeft: 'auto',
            height: 'max-content',
            flexGrow: '0',
            width: 'max-content'
        }}>
            {simple ?
                <a style={{height: 'max-content'}} href={`/compare#${loggedUserID}&${pageUser.user_id}`}>
                    <ValueIndicator
                        value={loggedDP === null ? (0) : (calculateSimilarity(loggedDP, longTermDP).overall)}
                        diameter={50}/>
                </a>
                :
                <>
                    <div style={{maxWidth: '500px', marginRight: 'auto', textAlign: 'right'}}>
                        <h3 style={{margin: 0}}>Compare</h3>
                        <p style={{marginTop: 0}}>See how your stats stack up against {pageUser.username}'s.</p>
                        <div className={'terms-container'} style={{justifyContent: 'right'}}>
                            <a href={`/compare#${loggedUserID}&${pageUser.user_id}`}
                               className={'subtle-button'}>Compare</a>
                        </div>
                    </div>
                    <ValueIndicator
                        value={loggedDP === null ? (0) : (calculateSimilarity(loggedDP, longTermDP).overall)}
                        diameter={64.5}/>
                </>
            }
        </div>
    )
}

function UserContainer(props) {
    const {windowWidth, user, followers, isLoggedUserFollowing, loggedUserID, isOwnPage, longTermDP} = props;

    const ShareProfileButton = (props) => {
        const {simple = false} = props;
        const origin = (new URL(window.location)).origin;
        const link = `${origin}/profile/{user.user_id}`;

        const [copied, setCopied] = useState(false);

        const handleShare = () => {
            const content = {
                title: "Harked",
                text: `View ${user.username}'s profile on Harked.`,
                url: link
            }
            try {
                if (navigator.canShare(content)) {
                    navigator.share(content).then(() => setCopied(true));
                } else {
                    navigator.clipboard.writeText(`${origin}/profile/${user.user_id}`).then(() => setCopied(true));
                }
            } catch (error) {
                console.warn('Web Share API not supported. Copying to clipboard.', error);
                navigator.clipboard.writeText(`${origin}/profile/${user.user_id}`).then(() => setCopied(true));
            }

        }

        window.addEventListener('copy', () => {
            setCopied(false);
        })

        return (
            <>
                {simple === true ?
                    <button
                        style={{border: 'none', background: 'none', color: 'var(--primary-colour)', cursor: 'pointer'}}
                        onClick={handleShare}>
                        <IosShareIcon fontSize={'small'}/>
                    </button>
                    :
                    <button className={'std-button'} onClick={handleShare}>
                        {copied ?
                            "Copied link!"
                            :
                            "Share profile"
                        }
                    </button>
                }
            </>
        )
    }

    const [isFollowing, setIsFollowing] = useState(isLoggedUserFollowing);
    // For optimistic updates
    const [followerNumber, setFollowerNumber] = useState(followers.length);

    const handleFollowClick = () => {
        if (!isFollowing) {
            setIsFollowing(true);
            const n = followerNumber;
            setFollowerNumber(n + 1);
            followUser(loggedUserID, user.user_id).then(() => {
                console.info('User followed!');
            }).catch((err) => {
                console.warn(`Error following user: `, err);
                setIsFollowing(false);
                setFollowerNumber(n);
            })
        } else {
            setIsFollowing(false);
            const n = followerNumber;
            setFollowerNumber(n - 1);
            unfollowUser(loggedUserID, user.user_id).then(() => {
                console.info('User unfollowed!');
            }).catch((err) => {
                console.warn(`Error unfollowing user: `, err);
                setIsFollowing(true);
                setFollowerNumber(n);
            })
        }
    }

    useEffect(() => {
        setIsFollowing(isLoggedUserFollowing);
    }, [isLoggedUserFollowing]);

    useEffect(() => {
        setFollowerNumber(followers.length);
    }, [followers]);


    return (
        <div className='user-container'>
            <div style={{display: 'flex', flexDirection: 'row', maxHeight: '150px', gap: '15px'}}>
                {user.profile_picture && (
                    <div className={'profile-picture'}>
                        <img alt={'profile picture'} className={'levitating-image'} src={user.profile_picture}
                             style={{height: '100%', width: '100%', objectFit: 'cover'}}/>
                    </div>
                )}
                <div className={'user-details'}>
                    <p style={{margin: '0'}}>Profile for</p>
                    <h2 style={{margin: '-5px 0 0 0', fontSize: '30px', wordBreak: 'keep-all'}}>
                        {user.username}
                        <ShareProfileButton simple/>
                    </h2>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'center'}}>
                        <a href={`/followers#${user.user_id}`}
                           style={{margin: '0', color: 'var(--primary-colour)', textDecoration: 'none'}}><span
                            style={{fontWeight: 'bold'}}>{followerNumber}</span> follower{followerNumber !== 1 ? 's' : ''}
                        </a>
                        {isLoggedIn() && !isOwnPage && (
                            <button style={{
                                border: 'none',
                                background: 'none',
                                alignItems: 'center',
                                height: '20px',
                                width: '20px',
                                margin: '0',
                                padding: '0',
                                color: 'var(--primary-colour)',
                                cursor: 'pointer'
                            }}
                                    onClick={handleFollowClick}>
                                {isFollowing ?
                                    <CheckCircleOutlineIcon fontSize={'small'}/>
                                    :
                                    <AddCircleOutlineIcon fontSize={'small'}/>
                                }
                            </button>
                        )}
                    </div>
                </div>
                <div className={'user-links'}>
                    <SpotifyLink simple link={`https://open.spotify.com/user/${user.user_id}`}/>
                    <div style={{marginTop: 'auto'}}>
                        {windowWidth < 700 && !isOwnPage && isLoggedIn() &&
                            <ComparisonLink simple pageUser={user} loggedUserID={loggedUserID} longTermDP={longTermDP}/>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export function TopContainer(props : {}) {
    const {
        pageUser,
        followers,
        isLoggedUserFollowing,
        isOwnPage,
        loggedUserID,
        longTermDP,
        terms,
        setTermIndex,
        termIndex
    } = props;

    return (
        <div>
            <UserContainer user={pageUser} followers={followers}
                           isLoggedUserFollowing={isLoggedUserFollowing} isOwnPage={isOwnPage}
                           loggedUserID={loggedUserID} longTermDP={longTermDP} terms={terms} setTermIndex={setTermIndex}
                           termIndex={termIndex}/>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                marginTop: '25px',
                width: '100%',
                alignItems: 'left',
                gap: '15px'
            }}>
                <TermSelection terms={terms} termIndex={termIndex} setTermIndex={setTermIndex}/>
                {!isOwnPage && isLoggedIn() && windowWidth > 700 &&
                    <ComparisonLink pageUser={pageUser} loggedUserID={loggedUserID} longTermDP={longTermDP}/>
                }
            </div>
        </div>
    );
}