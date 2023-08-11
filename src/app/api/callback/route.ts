import querystring from 'querystring';
import {CLIENT_ID, CLIENT_SECRET} from "@/app/api/constants";

export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);
    const code = searchParams.get('code');

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // @ts-ignore
            Authorization: 'Basic ' + new Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
        },
        body: querystring.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: 'http://localhost:3000/api/callback',
        }),
    });

    const tokenData = await tokenResponse.json();
    const {access_token, expires_in, refresh_token} = tokenData;

    const access_cookie = `${access_token}; Max-Age=${expires_in}`;
    const refresh_cookie = `${refresh_token}; Max-Age=${2592000}`;

    const combinedCookies = `access-token=${access_cookie}, refresh-token=${refresh_cookie}`;

    const headers = new Headers({"Set-Cookie": combinedCookies});

    return new Response(JSON.stringify({ok: true, access_token, expires_in}), {headers});
}
