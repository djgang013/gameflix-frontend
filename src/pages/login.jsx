import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
    // 1. Manage the form inputs and UI state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // 2. This hook allows us to redirect the user after they log in
    const navigate = useNavigate();

    // 3. Handle the form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        try {
            if (isLoginMode) {
                // --- LOGIN PROCESS ---
                const response = await api.post('/auth/login', { username, password });
                localStorage.setItem('token', response.data.token);
                navigate('/games');
            } else {
                // --- REGISTRATION PROCESS ---
                await api.post('/auth/register', { username, password });
                alert("Registration successful! Please log in.");
                setIsLoginMode(true);
                setPassword('');
            }
        } catch (error) {
            if (error.response && error.response.data) {
                setErrorMessage(error.response.data);
            } else {
                setErrorMessage("An error occurred. Please try again.");
            }
        }
    };

    return (
        <div style={styles.wrapper}>
            {/* The dark vignette overlay to make the text readable */}
            <div style={styles.overlay}></div>

            {/* The Netflix-style floating glass box */}
            <div style={styles.loginBox}>
                <h1 style={styles.title}>{isLoginMode ? 'Sign In' : 'Create an Account'}</h1>

                {errorMessage && <div style={styles.errorBox}><p style={styles.errorText}>{errorMessage}</p></div>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <button type="submit" style={styles.button}>
                        {isLoginMode ? 'Login' : 'Register'}
                    </button>
                </form>

                <p style={styles.toggleText}>
                    {isLoginMode ? "New to Gamesflix? " : "Already have an account? "}
                    <span
                        style={styles.toggleLink}
                        onClick={() => {
                            setIsLoginMode(!isLoginMode);
                            setErrorMessage('');
                        }}
                    >
                        {isLoginMode ? 'Sign up now.' : 'Sign in here.'}
                    </span>
                </p>
            </div>
        </div>
    );
}

// --- PREMIUM NETFLIX STYLES ---
const styles = {
    // 1. The Massive Cinematic Background
    wrapper: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: 'url("https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    },

    // 2. The Dark Vignette
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.8) 100%)',
        zIndex: 1
    },

    // 3. The Glassmorphism Card
    loginBox: {
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: '60px 68px 40px',
        borderRadius: '4px',
        width: '100%',
        maxWidth: '450px',
        zIndex: 2,
        boxShadow: '0 15px 30px rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)'
    },

    title: { color: 'white', fontSize: '2rem', marginBottom: '28px', fontWeight: 'bold' },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },

    input: {
        backgroundColor: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '16px 20px',
        fontSize: '1rem',
        outline: 'none'
    },

    button: {
        backgroundColor: '#e50914',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '16px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '24px',
        transition: 'background-color 0.2s'
    },

    // Sleek Error Box
    errorBox: { backgroundColor: '#e87c03', borderRadius: '4px', padding: '10px 20px', marginBottom: '16px' },
    errorText: { color: 'white', fontSize: '14px', margin: 0 },

    // Footer toggles
    toggleText: { color: '#737373', marginTop: '40px', fontSize: '1rem' },
    toggleLink: { color: 'white', cursor: 'pointer', textDecoration: 'none', fontWeight: '500' }
};