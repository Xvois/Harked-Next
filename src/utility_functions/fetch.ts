export async function fetchSpotify(endpoint:string) {

    const res =  await fetch(`/api/spotify?endpoint=${endpoint}`);

    if (!res.ok) {
        throw new Error('Failed to fetch Spotify data.');
    }

    return res.json();
}