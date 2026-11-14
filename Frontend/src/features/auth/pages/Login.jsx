import React, { useState } from 'react'
import {useNavigate,Link} from 'react-router'
import '../auth.form.scss'
import { useAuth } from '../Hooks/useAuth.js'
import Loader from '../../../components/Loader'


const Login = () => {

    const { loading,handleLogin } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // Temporary function to prevent form submission
    const handleSubmit = async(e) => {
        e.preventDefault()
        setSubmitting(true)
        const { success, message } = await handleLogin({ email, password })
        setSubmitting(false)

        if (success) {
            navigate("/")
        } else {
            alert(message || "Invalid email or password")
        }
    }

    // the full screen loader is only for the first session check, while signing in the form stays on screen
    if(loading && !submitting){
        return <Loader title="Checking your session" message="Just a moment…" />
    }

  return (
    <main>
        <div className="form-container">
            <h1>Login</h1>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input
                        value={email}
                        onChange={(e)=> {setEmail(e.target.value)}}
                        type="email" id="email" name="email" placeholder='Enter Email' required />
                </div>
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input
                        value={password}
                        onChange={(e)=> {setPassword(e.target.value)}}
                        type="password" id="password" name="password" placeholder='Enter Password' required />
                </div>

                <button className='button primary-button' disabled={submitting} aria-busy={submitting}>
                    {submitting ? <><span className='button__spinner' />Signing in…</> : 'Login'}
                </button>
            </form>

            <p>Don't have an account? <Link to="/register">Register</Link></p>
        </div>
    </main>
  )
}

export default Login