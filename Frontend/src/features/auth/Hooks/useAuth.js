import { useContext } from "react";
import { AuthContext } from "../auth.context.jsx";
import {login, register, logout} from "../services/auth.api.js"


export const useAuth = () => {

    const context =useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context

    const handleLogin = async({email, password}) => {
        setLoading(true)
        try{
            const data = await login({email, password}) // call login api from auth.api.js
             if (!data) return false
            setUser(data.user)
            return true   
            
        }catch(error){
            return false

        }finally{
            setLoading(false)
        }
        
    }

    const handleRegister = async({username, email, password}) => {
        setLoading(true)
        try{
            const data = await register({username, email, password}) // call register api from auth.api.js
            if (!data) return false
            setUser(data.user)
            return true
        }catch(error){
            return false
        }
        finally{
            setLoading(false)
        }
    }

    const handleLogout = async() => {
        setLoading(true)
        try{
            await logout() // call logout api from auth.api.js
            setUser(null)
            return true
            
        }catch(error){
            return false
        }
        finally{
            setLoading(false)
        }

    }

    // the logged in user is fetched once in AuthProvider (auth.context.jsx), not in every component using this hook

    return {user, loading, handleLogin, handleRegister, handleLogout}
}