"use client"
/**
 * This component deals with capturing and storing the authentication token after
 * authorisation by the Spotify OAuth service.
 */
import {pb} from "@/database_functions/hooks";
import {formatUser} from "@/database_functions/format";
import {userExists} from "@/database_functions/users";
import {hashString} from "@/utility_functions/utilities";
import {putPBData} from "@/database_functions/push";
import {useEffect} from "react";
import {redirect} from "next/navigation";
import {User} from "@/interfaces/UserInterfaces";

function Authentication() {

    const catchSpotifyToken = () => {
        const url = new URL(window.location.href);
        const hash = url.hash;
        const re = /=(.*?)&/;
        const match = hash.match(re);

        if (match) {
            const localToken = decodeURIComponent(match[1]);
            window.location.hash = '';
            window.localStorage.setItem('access-token', localToken);

            const redirectPath = window.localStorage.getItem('redirect');
            if (redirectPath) {
                window.localStorage.removeItem('redirect');
                redirect(redirectPath);
            } else {
                redirect('/profile/me');
            }
        } else {
            throw new Error('Failed to catch Spotify token.');
        }
    };

    useEffect(() => {
        // Grab code from returned url params
        const urlParams = new URLSearchParams(window.location.search);
        const rawProvider = localStorage.getItem('provider');
        const code = urlParams.get('code');

        // Create the redirect url for pb authentication
        const url = new URL(window.location.toString());
        const redirectURL = `${url.origin}/authentication`;

        if (code) {
            // Store code for use in alternate reauth
            localStorage.setItem('code', code);
        }

        // Authenticate with pb
        console.log(pb.authStore);
        // Are we authed already?
        if (!pb.authStore.isValid && rawProvider && code) {

            console.info('pb authStore is not valid')
            const provider = JSON.parse(rawProvider);

            pb.collection('users').authWithOAuth2Code(
                provider.name,
                code,
                provider.codeVerifier,
                redirectURL,
            ).then((authData) => {
                if (authData.meta && pb.authStore.model) {
                    // authenticate
                    const id = pb.authStore.model.id;
                    const user = authData.meta.rawUser;
                    window.localStorage.setItem('access-token', authData.meta.accessToken);
                    let fUser = formatUser(user)

                    // FIXME: TEMP FIX
                    fUser.username = fUser.username.replaceAll(' ', '-');

                    userExists(fUser.user_id).then(exists => {
                        if (!exists) {
                            pb.collection('users').update(id, fUser)
                                .then(async () => {
                                    await updateUserDataAndRelated(id, fUser);
                                    redirect('/profile/me');
                                });
                        } else {
                            const redirectPath = window.localStorage.getItem("redirect");
                            if (redirectPath) {
                                window.localStorage.removeItem("redirect");
                                redirect(redirectPath);
                            } else {
                                redirect('/profile/me');
                            }
                        }
                    })
                } else {
                    throw new Error('Auth failed. Meta or modal not found.');
                }
            }).catch((err) => {
                console.log("Failed to exchange code.\n" + err);
            });
        } else {
            console.info('Attempting to catch spotify token.')
            if (window.location.hash) {
                catchSpotifyToken();
            }
        }
    }, []);

    // Function to update user data and related data
    const updateUserDataAndRelated = async (id: string, fUser: User) => {
        try {
            const hash = hashString(fUser.user_id);
            const followers = {id: hash, user: id, followers: []};
            const following = {id: hash, user: id, following: []};
            const settings = {id: hash, user: id, public: true};
            const profile_data = {id: hash, user: id};
            const profile_comments = {id: hash, owner: id, comments: []};
            const profile_recommendations = {id: hash, user: id, recommendations: []};
            await Promise.all([
                putPBData("user_followers", followers),
                putPBData("user_following", following),
                putPBData("settings", settings),
                putPBData("profile_data", profile_data),
                putPBData("comment_section", profile_comments),
                putPBData("profile_recommendations", profile_recommendations),
            ]);
        } catch (error) {
            console.error('Error patching user: ', error);
            console.info('User: ', fUser);
            console.info('Username: ', fUser.username);
            pb.collection('users').delete(id).then(() => {
                console.info('User successfully removed as a result.')
            }).catch((deletionError) => {
                console.error('Error subsequently deleting user: ', deletionError);
            });
        }
    };

    return (
        <div>
            <h2>Redirecting...</h2>
            <p>Stuck on this page? <a style={{color: 'var(--primary-colour)'}}
                                      href={window.localStorage.getItem("redirect") ?? '/profile/me'}>Click here to
                redirect.</a></p>
        </div>
    )
}

export default Authentication