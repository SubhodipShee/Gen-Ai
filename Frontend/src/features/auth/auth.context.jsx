import { createContext , useState, useEffect } from "react";
import { getMe } from "./services/auth.api.js"



export const AuthContext = createContext()

// AuthProvider component that wraps the app and provides the auth state
export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)    //this set to true in production & false in development to avoid the loading state on every refresh during development.

    // fetch the logged in user only once when the app starts (it was running in every component that used useAuth)
    useEffect(() => {

        const getAndSetUser = async () => {
        try {
            const data = await getMe()
            setUser(data?.user || null)
        } catch (error) {
            setUser(null)
        } finally {
            setLoading(false)
        }
        }

        getAndSetUser()

    }, [])


 // state layer provides user and loading state to the rest of the app
    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading }}>
            {children}
        </AuthContext.Provider>
    )
}