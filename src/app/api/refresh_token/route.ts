import querystring from "querystring";
import {CLIENT_ID, CLIENT_SECRET} from "@/app/api/constants";
import {redirect} from "next/navigation";


export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);
    const refresh_token = searchParams.get('refresh_token');

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            //@ts-ignore
            Authorization: 'Basic ' + new Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
        },
        body: querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token,
        }),
    });

    const tokenData = await tokenResponse.json();
    const {access_token, expires_in} = tokenData;

    const access_cookie = `${access_token}; Max-Age=${expires_in}`;

    const headers = new Headers({"Set-Cookie": `access-token=${access_cookie}`});

    return new Response(JSON.stringify({ok: true}), {headers});
}
