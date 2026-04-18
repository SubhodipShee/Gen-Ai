import { createContext , useState,  } from "react";



export const AuthContext = createContext()

// AuthProvider component that wraps the app and provides the auth state
export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(false)



 // state layer provides user and loading state to the rest of the app
    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading }}>
            {children}
        </AuthContext.Provider>
    )
}