import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import AddGameModal from '../components/AddGameModal';

export default function Games() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // UI Toggles
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConsoleMode, setIsConsoleMode] = useState(false);
    const [userRole, setUserRole] = useState('ROLE_USER');

    const navigate = useNavigate();

    useEffect(() => {
        // Read the role from the token!
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.role) setUserRole(decoded.role);
            } catch (err) {
                console.error("Could not decode token");
            }
        }
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            const response = await api.get('/games');
            setGames(response.data);
            console.log(JSON.stringify(response.data[0], null, 2)); // <-- ADD THIS LINE
            setLoading(false);
        } catch (err) {
            setError('Failed to load games.');
            setLoading(false);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                handleLogout();
            }
        }
    };
    const handleDeleteGame = async (e, id) => {
        // e.stopPropagation() prevents the click from triggering the card's navigation to the "Play" screen
        e.stopPropagation();

        // Add a safety confirmation so they don't accidentally delete a game
        if (window.confirm("Are you sure you want to delete this game? This cannot be undone.")) {
            try {
                await api.delete(`/games/${id}`);
                fetchGames(); // Instantly refresh the list to remove the deleted game
            } catch (err) {
                console.error(err);
                alert("Failed to delete the game. You might not have permission.");
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (loading) return <div style={styles.loadingScreen}><h2>Loading Gamesflix...</h2></div>;

    // The dynamic background based on the mode
    const containerStyle = {
        ...styles.container,
        backgroundColor: isConsoleMode ? '#0a101e' : '#141414',
        backgroundImage: isConsoleMode ? 'radial-gradient(circle at center, #1b2838 0%, #000000 100%)' : 'none'
    };

    return (
        <div style={containerStyle}>
            {/* NAVBAR */}
            <nav style={styles.navbar}>
                <h1 style={styles.logo}>🎮 GAMESFLIX</h1>
                <div style={styles.navControls}>

                    {/* ONLY REGULAR USERS SEE THE CONSOLE TOGGLE */}
                    {userRole !== 'ROLE_ADMIN' && (
                        <button
                            style={styles.consoleToggleButton}
                            onClick={() => setIsConsoleMode(!isConsoleMode)}
                        >
                            {isConsoleMode ? '🖥️ Desktop Mode' : '🎮 Console Mode'}
                        </button>
                    )}

                    {/* ONLY ADMINS SEE THE ADD GAME BUTTON */}
                    {userRole === 'ROLE_ADMIN' && (
                        <button style={styles.adminButton} onClick={() => setIsAddModalOpen(true)}>
                            + Add Game
                        </button>
                    )}

                    <button onClick={handleLogout} style={styles.logoutButton}>Sign Out</button>
                </div>
            </nav>

            {/* ERROR MESSAGE */}
            {error && <p style={styles.error}>{error}</p>}

            {/* SMOOTH FADING RENDER AREA */}
            <div style={{ transition: 'opacity 0.5s ease', opacity: loading ? 0 : 1 }}>

                {isConsoleMode ? (
                    /* --- CONSOLE / BIG PICTURE VIEW --- */
                    <div style={{ textAlign: 'center', paddingTop: '50px' }}>
                        <h2 style={{ fontSize: '3rem', margin: '0 0 20px 0', textShadow: '2px 2px 4px #000', color: '#e5e5e5' }}>
                            Recent Games
                        </h2>
                        <div className="console-carousel">
                            {games.map((game) => (
                                <div key={game.id} className="console-card" onClick={() => {
                                    if (game.gameType === 'CODED' && game.assetPath) {
                                        navigate(game.assetPath);
                                    } else {
                                        navigate(`/play/${game.id}`);
                                    }
                                }}>
                                    <img
                                        src={game.thumbnailUrl || 'https://dummyimage.com/600x400/222/fff&text=No+Cover'}
                                        className="console-image"
                                        alt={game.title}
                                    />
                                    <div className="console-overlay">
                                        <h2 style={{ margin: 0, fontSize: '2rem' }}>{game.title}</h2>
                                        <p style={{ margin: '10px 0 0 0', color: '#66c0f4' }}>Press to Play</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* --- NORMAL DESKTOP VIEW --- */
                    <>
                        <div className="hero-banner">
                            <h2 style={styles.heroTitle}>Unlimited Gaming.</h2>
                            <p style={styles.heroSub}>Play anywhere. Cancel anytime.</p>
                        </div>

                        <div style={styles.content}>
                            <h3 style={styles.sectionTitle}>Available to Play</h3>
                            <div style={styles.grid}>
                                {games.length === 0 ? <p style={styles.noGames}>No games available right now.</p> : null}
                                {games.map((game) => (
                                    <div
                                        key={game.id}
                                        className="game-card"
                                        onClick={() => {
                                            if (game.gameType === 'CODED' && game.assetPath) {
                                                navigate(game.assetPath); // Sends them to /play/tictactoe
                                            } else {
                                                navigate(`/play/${game.id}`); // Sends them to the iframe player
                                            }
                                        }}
                                        style={{ padding: 0, position: 'relative' }} /* Added position relative for the absolute button */
                                    >

                                        {/* 🔴 NEW: THE ADMIN DELETE BUTTON */}
                                        {userRole === 'ROLE_ADMIN' && (
                                            <button
                                                style={styles.deleteButton}
                                                onClick={(e) => handleDeleteGame(e, game.id)}
                                                title="Delete Game"
                                            >
                                                🗑️
                                            </button>
                                        )}

                                        <img
                                            src={game.thumbnailUrl || 'https://placehold.co/600x400/222222/FFFFFF/png?text=No+Cover'}
                                            alt={game.title}
                                            className="game-poster"
                                            onError={(e) => {
                                                // If the main image fails to load, swap to this backup immediately!
                                                e.target.onerror = null; // Prevents an infinite loop if the backup ALSO fails
                                                e.target.src = 'https://placehold.co/600x400/141414/e50914/png?text=Image+Error';
                                            }}
                                        />
                                        <div style={{ padding: '20px' }}>
                                            <h3 style={styles.cardTitle}>{game.title}</h3>
                                            <p style={styles.cardDesc}>{game.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ADMIN MODAL */}
            <AddGameModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onGameAdded={() => { setIsAddModalOpen(false); fetchGames(); }} />
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", transition: 'all 0.5s ease' },
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 50px', position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(20, 20, 20, 0.9)', backdropFilter: 'blur(10px)' },
    logo: { margin: 0, color: '#e50914', fontSize: '28px', letterSpacing: '2px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' },
    navControls: { display: 'flex', gap: '15px', alignItems: 'center' },
    consoleToggleButton: { padding: '8px 20px', backgroundColor: '#3d4450', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
    adminButton: { padding: '8px 16px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid #fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    logoutButton: { padding: '8px 16px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    heroTitle: { fontSize: '4rem', margin: '0 0 10px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
    heroSub: { fontSize: '1.5rem', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.8)', color: '#e5e5e5' },
    content: { padding: '0 50px 50px 50px', marginTop: '20px' },
    sectionTitle: { fontSize: '1.5rem', marginBottom: '20px', color: '#e5e5e5' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' },
    cardTitle: { marginTop: '0', color: '#fff', fontSize: '1.2rem' },
    cardDesc: { color: '#aaa', fontSize: '14px', lineHeight: '1.4', marginBottom: '10px' },
    loadingScreen: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#141414', color: '#e50914' },
    error: { color: '#e50914', padding: '10px', backgroundColor: 'rgba(229, 9, 20, 0.1)', borderRadius: '4px', margin: '20px 50px' },
    noGames: { color: '#aaa', gridColumn: '1 / -1', fontSize: '1.2rem' },
    deleteButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(229, 9, 20, 0.9)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '35px',
        height: '35px',
        cursor: 'pointer',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        fontSize: '16px'
    }

};