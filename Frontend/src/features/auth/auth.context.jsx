import { createContext , useState,  } from "react";



export const AuthContext = createContext()

// AuthProvider component that wraps the app and provides the auth state
export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(false)    //this set to true in production & false in development to avoid the loading state on every refresh during development.



 // state layer provides user and loading state to the rest of the app
    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading }}>
            {children}
        </AuthContext.Provider>
    )
}