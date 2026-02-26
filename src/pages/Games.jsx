import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AddGameModal from '../components/AddGameModal';

export default function Games() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Check if the user is an admin by looking at the token payload (if your backend supports it)
    // For now, we'll keep the Add Game button available to test the 403 Security block

    const navigate = useNavigate();

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            const response = await api.get('/games');
            setGames(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to load games. Please log in again.');
            setLoading(false);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                handleLogout();
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (loading) return <div style={styles.loadingScreen}><h2 className="pulse">Loading Gamesflix...</h2></div>;

    return (
        <div style={styles.container}>
            {/* 1. STICKY NAVBAR */}
            <nav style={styles.navbar}>
                <h1 style={styles.logo}>🎮 GAMESFLIX</h1>
                <div style={styles.navControls}>
                    <button style={styles.adminButton} onClick={() => setIsAddModalOpen(true)}>
                        + Add Game
                    </button>
                    <button onClick={handleLogout} style={styles.logoutButton}>
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* 2. HERO BANNER */}
            <div className="hero-banner">
                <h2 style={styles.heroTitle}>Unlimited Gaming.</h2>
                <p style={styles.heroSub}>Play anywhere. Cancel anytime. Admin approved.</p>
            </div>

            {/* 3. MAIN CONTENT */}
            <div style={styles.content}>
                <h3 style={styles.sectionTitle}>Available to Play</h3>

                {error && <p style={styles.error}>{error}</p>}

                <div style={styles.grid}>
                    {games.length === 0 ? (
                        <p style={styles.noGames}>No games available right now. An admin needs to add some!</p>
                    ) : (
                        games.map((game) => (
                            <div
                                key={game.id}
                                className="game-card"
                                onClick={() => navigate(`/play/${game.id}`)}
                                style={{ padding: 0 }} /* Overrides the 20px padding to let the image hit the edges */
                            >
                                {/* 1. THE GAME POSTER */}
                                <img
                                    src={game.thumbnailUrl || 'https://dummyimage.com/300x160/222222/ffffff&text=No+Cover'}
                                    alt={game.title}
                                    className="game-poster"
                                />

                                {/* 2. THE CARD TEXT (wrapped in a div for padding) */}
                                <div style={{ padding: '20px' }}>
                                    <h3 style={styles.cardTitle}>{game.title}</h3>
                                    <p style={styles.cardDesc}>{game.description}</p>
                                    <span style={styles.badge}>
                                        {game.gameType === 'EMBEDDED' ? '🌐 Web Game' : '💻 Custom Code'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <AddGameModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onGameAdded={() => {
                    setIsAddModalOpen(false);
                    fetchGames();
                }}
            />
        </div>
    );
}

const styles = {
    container: { backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" },

    // Navbar
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 50px', position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(20, 20, 20, 0.9)', backdropFilter: 'blur(10px)' },
    logo: { margin: 0, color: '#e50914', fontSize: '28px', letterSpacing: '2px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' },
    navControls: { display: 'flex', gap: '15px' },
    adminButton: { padding: '8px 16px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid #fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' },
    logoutButton: { padding: '8px 16px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },

    // Hero
    heroTitle: { fontSize: '4rem', margin: '0 0 10px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
    heroSub: { fontSize: '1.5rem', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.8)', color: '#e5e5e5' },

    // Grid Content
    content: { padding: '0 50px 50px 50px', marginTop: '20px' },
    sectionTitle: { fontSize: '1.5rem', marginBottom: '20px', color: '#e5e5e5' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' },

    // Card Internal Styles
    cardTitle: { marginTop: '0', color: '#fff', fontSize: '1.2rem' },
    cardDesc: { color: '#aaa', fontSize: '14px', lineHeight: '1.4', marginBottom: '20px' },
    badge: { position: 'absolute', bottom: '20px', left: '20px', padding: '4px 8px', backgroundColor: '#e50914', fontSize: '12px', borderRadius: '4px', fontWeight: 'bold' },

    // Utilities
    loadingScreen: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#141414', color: '#e50914' },
    error: { color: '#e50914', padding: '10px', backgroundColor: 'rgba(229, 9, 20, 0.1)', borderRadius: '4px', borderLeft: '4px solid #e50914' },
    noGames: { color: '#aaa', gridColumn: '1 / -1', fontSize: '1.2rem' }
};