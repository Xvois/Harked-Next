import {pb} from "@/database_functions/hooks";
import {SCOPES} from "@/app/authentication/public_constants/api";

export async function authRefresh() {
    console.info("Refreshing auth token.")
    await pb.collection('users').authRefresh().then(function (auth) {
        console.info(auth)
        window.localStorage.setItem("access-token", auth.token);
    })
}

export function reAuthenticate() {
    const url = new URL(window.location.toString());
    const params = new URLSearchParams([
        ["client_id", "a0b3f8d150d34dd79090608621999149"],
        ["redirect_uri", `${url.origin}/authentication`],
        ["response_type", "token"],
        ["scope", SCOPES] // Pass the converted string value
    ]);
    window.localStorage.setItem("redirect", `${url.pathname + url.hash}`);
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}