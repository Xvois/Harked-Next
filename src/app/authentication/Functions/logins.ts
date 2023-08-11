import {pb} from "@/database_functions/hooks";
import {redirect} from "next/navigation";
import {CLIENT_ID, SCOPES} from "@/app/api/constants";

export function handleLogin() {
    redirect("/authentication");
}

export const handleAlternateLogin = async () => {
    console.info('Attempting alternate OAuth with Spotify.');
    const url = new URL(window.location.toString());
    const redirectURL = `${url.origin}/authentication`;
    const authMethodsList = await pb.collection('users').listAuthMethods();
    const authDetails = authMethodsList.authProviders[0];
    window.localStorage.setItem("provider", JSON.stringify(authDetails));
    let args = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: SCOPES,
        redirect_uri: redirectURL,
        state: authDetails.state,
        code_challenge_method: 'S256',
        code_challenge: authDetails.codeChallenge
    });
    redirect('https://accounts.spotify.com/authorize?' + args);
}