import axios from 'axios';




// Create an axios instance with the base URL and credentials configuration 
const api = axios.create({
    baseURL: 'http://localhost:3000',
    withCredentials: true
})

// Registration function to call the registration endpoint
export async function register({username, email, password}) {

    
    try{
        const response = await api.post('/api/auth/register', {
        username,
        email,
        password
    })
    return response.data

    }
    catch(err){
        console.log(err);
    }
    
}

// Login function to call the login endpoint
export async function login({email, password}) {
    try{
        const response = await api.post('/api/auth/login', {
            email,
            password
        })
        return response.data
    }
    catch(err){
        console.log(err);
    }
}


// Logout function to call the logout endpoint
export async function logout() {
    try{
        const response = await api.get('/api/auth/logout')
        return response.data
    }
    catch(err){
        console.log(err);
    }
}


// Get current user function to call the get-me endpoint
export async function getMe() {
    try{
        const response = await api.get('/api/auth/get-me')
        return response.data
    }
    catch(err){
        console.log(err);
    }
}