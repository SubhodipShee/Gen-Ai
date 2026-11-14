import axios from "axios"


const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
})

export async function register({ username, email, password }) {

    try {
        const response = await api.post('/api/auth/register', {
            username, email, password
        })

        return response.data

    } catch (err) {

        console.log(err.response?.data || err.message)
        return { message: err.response?.data?.message } // no user, but the reason from the server (e.g. too many attempts)

    }

}

export async function login({ email, password }) {

    try {

        const response = await api.post("/api/auth/login", {
            email, password
        })

        return response.data

    } catch (err) {
        console.log(err.response?.data || err.message)
        return { message: err.response?.data?.message } // no user, but the reason from the server (e.g. too many attempts)
    }

}

export async function logout() {
    try {

        const response = await api.get("/api/auth/logout")

        return response.data

    } catch {
        // a failed logout request is ignored, the user is logged out on the screen anyway
    }
}

export async function getMe() {

    try {

        const response = await api.get("/api/auth/get-me")

        return response.data

    } catch (err) {
         if (err.response?.status === 401) {
            return null // <-- IMPORTANT
        }
        console.log(err)
    }

}