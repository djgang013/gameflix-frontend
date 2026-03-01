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
            console.log(JSON.stringify(response.data[0], null, 2));
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
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this game? This cannot be undone.")) {
            try {
                await api.delete(`/games/${id}`);
                fetchGames();
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

    const containerStyle = {
        ...styles.container,
        backgroundColor: isConsoleMode ? '#0a101e' : '#141414',
        backgroundImage: isConsoleMode ? 'radial-gradient(circle at center, #1b2838 0%, #000000 100%)' : 'none'
    };

    return (
        <div style={containerStyle}>
            {/* NAVBAR */}
            <nav style={styles.navbar}>
                <h1 style={styles.logo}>GAMESFLIX</h1>
                <div style={styles.navControls}>

                    {userRole !== 'ROLE_ADMIN' && (
                        <button
                            style={styles.consoleToggleButton}
                            onClick={() => setIsConsoleMode(!isConsoleMode)}
                        >
                            {isConsoleMode ? '🖥️ Desktop Mode' : '🎮 Console Mode'}
                        </button>
                    )}

                    {userRole === 'ROLE_ADMIN' && (
                        <button style={styles.addButton} onClick={() => setIsAddModalOpen(true)}>
                            + Add Game
                        </button>
                    )}

                    <button onClick={handleLogout} style={styles.logoutButton}>Sign Out</button>
                </div>
            </nav>

            {error && <p style={styles.error}>{error}</p>}

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
                    /* --- NORMAL DESKTOP VIEW (NETFLIX STYLE) --- */
                    <>
                        {/* CINEMATIC HERO SECTION */}
                        <div style={styles.hero}>
                            <div style={styles.heroGradient}></div>
                            <div style={styles.heroContent}>
                                <h1 style={styles.heroTitle}>Unlimited Gaming.</h1>
                                <p style={styles.heroSubtitle}>Play anywhere. Cancel anytime.</p>
                            </div>
                        </div>

                        {/* CATALOG GRID */}
                        <div style={styles.catalogSection}>
                            <h3 style={styles.sectionTitle}>Available to Play</h3>

                            <div style={styles.grid}>
                                {games.length === 0 ? <p style={styles.noGames}>No games available right now.</p> : null}
                                {games.map((game) => (
                                    <div
                                        key={game.id}
                                        className="game-card"
                                        onClick={() => {
                                            if (game.gameType === 'CODED' && game.assetPath) {
                                                navigate(game.assetPath);
                                            } else {
                                                navigate(`/play/${game.id}`);
                                            }
                                        }}
                                    >
                                        {/* ADMIN DELETE BUTTON */}
                                        {userRole === 'ROLE_ADMIN' && (
                                            <button
                                                className="delete-btn" /* Added class for hover effects */
                                                style={styles.deleteButton}
                                                onClick={(e) => handleDeleteGame(e, game.id)}
                                                title="Delete Game"
                                            >
                                                🗑️
                                            </button>
                                        )}

                                        <img
                                            src={game.thumbnailUrl || 'https://placehold.co/400x600/222222/FFFFFF/png?text=No+Cover'}
                                            alt={game.title}
                                            className="game-poster"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://placehold.co/400x600/141414/e50914/png?text=Image+Error';
                                            }}
                                        />

                                        <h3 style={styles.cardTitle}>{game.title}</h3>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <AddGameModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onGameAdded={() => { setIsAddModalOpen(false); fetchGames(); }} />
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", paddingBottom: '50px', transition: 'all 0.5s ease' },

    // NAVBAR UPGRADES
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 50px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' },
    logo: { margin: 0, color: '#e50914', fontSize: '42px', fontFamily: '"Arial Black", Impact, sans-serif', fontWeight: '900', letterSpacing: '-2px', transform: 'scaleY(1.3)', display: 'inline-block', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', cursor: 'pointer' },
    navControls: { display: 'flex', gap: '15px', alignItems: 'center' },
    consoleToggleButton: { padding: '8px 20px', backgroundColor: '#3d4450', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },

    // PREMIUM BUTTONS
    addButton: { padding: '8px 16px', backgroundColor: 'rgba(109, 109, 110, 0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s ease', backdropFilter: 'blur(4px)' },
    logoutButton: { padding: '8px 16px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'background-color 0.2s ease' },

    // CINEMATIC HERO SECTION
    hero: {
        position: 'relative',
        height: '65vh',
        minHeight: '400px',
        backgroundImage: "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop')", // High-res dark controller background
        backgroundSize: 'cover',
        backgroundPosition: 'center 20%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 50px'
    },
    heroGradient: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(to right, rgba(20,20,20,0.8) 0%, rgba(20,20,20,0) 100%), linear-gradient(to bottom, rgba(20,20,20,0) 60%, #141414 100%)',
        zIndex: 1
    },
    heroContent: { position: 'relative', zIndex: 2, maxWidth: '600px', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
    heroTitle: { fontSize: '4rem', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '1px' },
    heroSubtitle: { fontSize: '1.5rem', fontWeight: '400', margin: 0, color: '#e5e5e5' },

    // GRID LAYOUT
    catalogSection: { padding: '0 50px', position: 'relative', zIndex: 3, marginTop: '-50px' }, // Pulls grid up slightly over the fade
    sectionTitle: { fontSize: '1.4rem', color: '#e5e5e5', marginBottom: '20px', fontWeight: 'bold' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' },

    // SLEEK DELETE BUTTON
    deleteButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        zIndex: 20,
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(4px)'
    },

    cardTitle: { marginTop: '10px', color: '#e5e5e5', fontSize: '1rem', textAlign: 'center', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

    // Utility
    loadingScreen: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#141414', color: '#e50914' },
    error: { color: '#e50914', padding: '10px', backgroundColor: 'rgba(229, 9, 20, 0.1)', borderRadius: '4px', margin: '20px 50px' },
    noGames: { color: '#aaa', gridColumn: '1 / -1', fontSize: '1.2rem' }
};