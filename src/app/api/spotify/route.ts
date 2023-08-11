import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {devLog} from "@/utility_functions/utilities";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    if(!endpoint){
        return new Response('No endpoint given.', {status: 400})
    }
    const cookieStore = cookies();

    const token = cookieStore.get("access-token");

    devLog(`https://api.spotify.com/v1/${endpoint}`);

    if(!token){
        return new Response('No access-token in cookies.', {status: 400});
    }

    const config = {
        headers: {
            Authorization: `Bearer ${token.value}`
        }
    }

    const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, config);

    const data = await res.json();

    return NextResponse.json(data);

}