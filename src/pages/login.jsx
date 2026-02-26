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
        e.preventDefault(); // Prevent the page from refreshing
        setErrorMessage(''); // Clear any old errors

        try {
            if (isLoginMode) {
                // --- LOGIN PROCESS ---
                const response = await api.post('/auth/login', { username, password });

                // Save the JWT token to the browser's local storage
                localStorage.setItem('token', response.data.token);

                // Redirect the user to the games dashboard
                navigate('/games');
            } else {
                // --- REGISTRATION PROCESS ---
                await api.post('/auth/register', { username, password });
                alert("Registration successful! Please log in.");
                setIsLoginMode(true); // Switch back to login mode
                setPassword(''); // Clear the password field
            }
        } catch (error) {
            // If Spring Boot throws an error (like 401 Unauthorized or 400 Bad Request)
            if (error.response && error.response.data) {
                setErrorMessage(error.response.data);
            } else {
                setErrorMessage("An error occurred. Please try again.");
            }
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>{isLoginMode ? 'Sign In to Gamesflix' : 'Create an Account'}</h2>

                {errorMessage && <p style={styles.error}>{errorMessage}</p>}

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
                    {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                    <span
                        style={styles.toggleLink}
                        onClick={() => {
                            setIsLoginMode(!isLoginMode);
                            setErrorMessage('');
                        }}
                    >
                        {isLoginMode ? 'Sign up here' : 'Log in here'}
                    </span>
                </p>
            </div>
        </div>
    );
}

// Simple inline styles to make it look decent immediately
const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#141414', color: 'white', fontFamily: 'Arial, sans-serif' },
    card: { backgroundColor: '#000000', padding: '40px', borderRadius: '8px', width: '300px', textAlign: 'center', border: '1px solid #333' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' },
    input: { padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#333', color: 'white' },
    button: { padding: '12px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    error: { color: '#e50914', fontSize: '14px' },
    toggleText: { marginTop: '20px', fontSize: '14px', color: '#b3b3b3' },
    toggleLink: { color: 'white', cursor: 'pointer', textDecoration: 'underline' }
};