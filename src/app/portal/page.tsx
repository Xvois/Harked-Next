"use client"
import {useEffect} from "react";
import {useSearchParams} from "next/navigation";

export default function Authentication() {

    const exchangeCode = async () => {
        let exchangeURL = `http://localhost:3000/api/exchange`;
        if (code) {
            exchangeURL += `?code=${code}`;
            await fetch(exchangeURL);
        }

    }

    useEffect(() => {

    }, []);


    return (
        <div>
            <h2>Create an Account</h2>
            <form>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        required
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input
                        type="password"
                        required
                    />
                </div>
                <button type="submit">Create Account</button>
            </form>
        </div>
    )
}