"use client"

import querystring from "querystring";
import {CLIENT_ID, SCOPES} from "@/app/api/constants";

export const LogoutButton = () => {
    const handleLogOut = () => {
        window.localStorage.clear();
        window.location.reload();
    }
    return <button className={"subtle-button"} onClick={handleLogOut}>Log out</button>
}


const handleNextLogin = () => {
     window.location.href = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: SCOPES,
            redirect_uri: "http://localhost:3000/portal",
            state: "ASDASDASDASDA"
        });
};

export const LoginButton = () => {
    return <button className="subtle-button" onClick={handleNextLogin}>Login with Spotify</button>
}