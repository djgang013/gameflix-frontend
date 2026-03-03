import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useGameTimer from '../hooks/useGameTimer';
import useGamepadExit from '../hooks/useGamepadExit';
export default function PlayGame() {
    // useParams grabs the ID right out of the web address!
    const { id } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    useGameTimer(game ? game.title : null);
    useGamepadExit();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchGame = async () => {
            try {
                // Fetch the single game from your Spring Boot backend
                const response = await api.get(`/games/${id}`);
                setGame(response.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to load the game. It might have been deleted.');
                setLoading(false);
            }
        };

        fetchGame();
    }, [id]);

    if (loading) return <h2 style={styles.loading}>Loading your game...</h2>;
    if (error) return <h2 style={styles.error}>{error}</h2>;
    if (!game) return null;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate('/games')} style={styles.backButton}>
                    ← Back to Library
                </button>
                <h1 style={styles.title}>{game.title}</h1>
            </div>

            <div style={styles.gameWrapper}>
                {game.gameType === 'EMBEDDED' ? (
                    // IFRAME: The magic tag that embeds external web games safely
                    <iframe
                        src={game.sourceUrl}
                        style={styles.iframe}
                        title={game.title}
                        allowFullScreen
                    />
                ) : (
                    <div style={styles.placeholder}>
                        <h2>Custom Game Code Detected</h2>
                        <p>File Path: {game.assetPath}</p>
                        <p>*(We will build the custom JS game engine later!)*</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '20px', backgroundColor: '#000', minHeight: '100vh', color: 'white', fontFamily: 'Arial' },
    header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' },
    backButton: { padding: '10px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    title: { margin: 0 },
    gameWrapper: { width: '100%', height: '80vh', backgroundColor: '#141414', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    iframe: { width: '100%', height: '100%', border: 'none' },
    placeholder: { textAlign: 'center', color: '#aaa' },
    loading: { color: 'white', textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' },
    error: { color: '#e50914', textAlign: 'center', marginTop: '50px' }
};