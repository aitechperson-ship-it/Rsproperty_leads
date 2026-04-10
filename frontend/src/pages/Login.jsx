import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, googleLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/admin'); // Or intelligently redirect based on role
    } catch (err) {
      alert('Login failed');
    }
  };

  const onGoogleSuccess = async (response) => {
    try {
      await googleLogin(response.credential);
      navigate('/team'); // Same here
    } catch (err) {
      alert('Google login failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
           <img src="/logo.png" alt="RS Properties" style={{ maxHeight: '80px', width: 'auto' }} />
        </div>
        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ position: 'relative' }}>
             <FiMail style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
            <input 
              type="email" 
              className="form-input" 
              style={{ paddingLeft: '40px' }}
              placeholder="Email address"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />
          </div>
          <div className="form-group" style={{ position: 'relative' }}>
             <FiLock style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              className="form-input" 
              style={{ paddingLeft: '40px' }}
              placeholder="Password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%', padding: '12px', fontSize: '1rem' }}>
            Sign In
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={() => {
              console.log('Login Failed');
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
