import { use, useContext,useEffect } from "react";
import { AuthContext } from "../auth.context.jsx";
import {login, register, logout,getMe} from "../services/auth.api.js"


export const useAuth = () => {

    const context =useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context

    const handleLogin = async({email, password}) => {
        setLoading(true)
        try{
            const data = await login({email, password}) // call login api from auth.api.js
            setUser(data.user)  
            
        }catch(error){

        }finally{
            setLoading(false)
        }
        

        
       
    }

    const handleRegister = async({username, email, password}) => {
        setLoading(true)
        try{
            const data = await register({username, email, password}) // call register api from auth.api.js
            setUser(data.user)

        }catch(error){
            
        }
        finally{
            setLoading(false)
        }
    }

    const handleLogout = async() => {
        setLoading(true)
        try{
            const data = await logout() // call logout api from auth.api.js
            setUser(null)
            
        }catch(error){
            
        }
        finally{
            setLoading(false)
        }

    }

     // useEffect to fetch the user data 
    useEffect(() => {

        const getAndSetUser = async () => {
            const data = await getMe()
            setUser(data.user)
            setLoading(false)
        }

        getAndSetUser()
        
    }, [])

    return {user, loading, handleLogin, handleRegister, handleLogout}
}