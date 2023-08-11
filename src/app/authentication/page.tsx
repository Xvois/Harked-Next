
export default function Authentication() {
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