import React,{ useState} from 'react'
import {useNavigate,Link} from 'react-router'
import { useAuth } from '../Hooks/useAuth';
import Loader from '../../../components/Loader';




const Register = () => {

    const navigate = useNavigate();
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const { loading,handleRegister } = useAuth();

  const handleSubmit = async(e) => {
        e.preventDefault();
        setSubmitting(true)
        const { success, message } = await handleRegister({ username, email, password });
        setSubmitting(false)

        if (success) {
            navigate("/");
        } else {
            alert(message || "Registration failed, please try again.")
        }
    }
    

    // the full screen loader is only for the first session check, while creating the account the form stays on screen
    if(loading && !submitting){
        return <Loader title="Checking your session" message="Just a moment…" />
    }

  return (
     <main>
        <div className="form-container">
            <h1>Register</h1>

            <form onSubmit={handleSubmit}>

                <div className="input-group">
                    <label htmlFor="username">Username</label>
                    <input
                      value={username}
                      onChange={(e)=> {setUsername(e.target.value)}}
                      type="text" id="username" name="username" placeholder='Enter Username' required />
                </div>
              
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input
                    value={email}
                    onChange={(e)=>{setEmail(e.target.value)}}
                    type="email" id="email" name="email" placeholder='Enter Email' required />
                </div>
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input
                    value={password}
                    onChange={(e)=>{setPassword(e.target.value)}}
                    type="password" id="password" name="password" placeholder='Enter Password' required />
                </div>

                <button className='button primary-button' disabled={submitting} aria-busy={submitting}>
                    {submitting ? <><span className='button__spinner' />Creating your account…</> : 'Register'}
                </button>
            </form>

            <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    </main>
  )
}

export default Register