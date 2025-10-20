import React from 'react'
import Login from './Login';
import Signup from './Signup';

const Auth = () => {
const [isLogin, setIsLogin] = React.useState(true);

return (
    <div>
        <div className='auth-container'>
            <div className='auth-form'>
                <div>
                    <button onClick={() => setIsLogin(true)}>Login</button>
                    <button onClick={() => setIsLogin(false)}>Sign Up</button>
                </div>
                <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
            </div>
        </div>
    </div>
)
}

export default Auth;
