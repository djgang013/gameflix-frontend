import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Rps() {
    const navigate = useNavigate();

    // React state strictly mirrors the Java DTO
    const [gameState, setGameState] = useState({
        playerScore: 0,
        computerScore: 0,
        lastPlayerChoice: null,
        lastComputerChoice: null,
        roundResult: null,
        matchOver: false,
        matchWinner: null
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchState();
    }, []);

    const fetchState = async () => {
        try {
            const response = await api.get('/rps/state');
            setGameState(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load RPS state", error);
        }
    };

    const handlePlay = async (choice) => {
        if (gameState.matchOver) return;

        try {
            const response = await api.post('/rps/play', { choice });
            setGameState(response.data);
        } catch (error) {
            console.error("Failed to play round", error);
        }
    };

    const handleReset = async () => {
        try {
            const response = await api.post('/rps/reset');
            setGameState(response.data);
        } catch (error) {
            console.error("Failed to reset game", error);
        }
    };

    // Helper function to turn text into emojis
    const getEmoji = (choice) => {
        if (choice === 'ROCK') return '🪨';
        if (choice === 'PAPER') return '📄';
        if (choice === 'SCISSORS') return '✂️';
        return '❓';
    };

    if (loading) return <h2 style={styles.loading}>Connecting to Java Engine...</h2>;

    return (
        <div style={styles.container}>
            <button onClick={() => navigate('/games')} style={styles.backButton}>
                ← Back to Library
            </button>

            <div style={styles.gameWrapper}>
                <h1 style={styles.title}>Rock, Paper, Scissors</h1>
                <h3 style={styles.subtitle}>Extreme Edition: First to 3 Wins!</h3>

                {/* SCOREBOARD */}
                <div style={styles.scoreboard}>
                    <div style={styles.scoreBox}>
                        <h2>You</h2>
                        <span style={styles.score}>{gameState.playerScore}</span>
                    </div>
                    <div style={styles.scoreBox}>
                        <h2>Java AI</h2>
                        <span style={{...styles.score, color: '#e50914'}}>{gameState.computerScore}</span>
                    </div>
                </div>

                {/* MATCH WINNER ANNOUNCEMENT */}
                {gameState.matchOver ? (
                    <div style={styles.matchWinnerBox}>
                        <h1 style={{ color: gameState.matchWinner === 'PLAYER' ? '#4caf50' : '#e50914', fontSize: '3rem', margin: 0 }}>
                            {gameState.matchWinner === 'PLAYER' ? '🏆 YOU WIN THE MATCH! 🏆' : '💀 JAVA AI WINS! 💀'}
                        </h1>
                        <p style={{ color: '#aaa', marginTop: '10px' }}>
                            {gameState.matchWinner === 'PLAYER' ? 'Your victory has been recorded on the Leaderboard.' : 'Better luck next time...'}
                        </p>
                        <button onClick={handleReset} style={styles.resetButton}>Play Again</button>
                    </div>
                ) : (
                    <>
                        {/* ROUND RESULT (Only shows if a round has been played) */}
                        {gameState.lastPlayerChoice && (
                            <div style={styles.roundResult}>
                                <p style={{ fontSize: '1.5rem', margin: '0 0 15px 0' }}>
                                    You played <strong>{getEmoji(gameState.lastPlayerChoice)}</strong> vs AI's <strong>{getEmoji(gameState.lastComputerChoice)}</strong>
                                </p>
                                <h2 style={{
                                    margin: 0,
                                    color: gameState.roundResult === 'WIN' ? '#4caf50' : gameState.roundResult === 'LOSE' ? '#e50914' : '#aaa'
                                }}>
                                    {gameState.roundResult === 'WIN' ? '+1 Point to You!' : gameState.roundResult === 'LOSE' ? '+1 Point to AI!' : "It's a Tie!"}
                                </h2>
                            </div>
                        )}

                        {/* WEAPON BUTTONS */}
                        <div style={styles.controls}>
                            <button style={styles.weaponBtn} onClick={() => handlePlay('ROCK')}>🪨</button>
                            <button style={styles.weaponBtn} onClick={() => handlePlay('PAPER')}>📄</button>
                            <button style={styles.weaponBtn} onClick={() => handlePlay('SCISSORS')}>✂️</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '30px', backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    backButton: { padding: '10px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '30px', transition: 'background 0.2s' },
    gameWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#1c1c1c', padding: '40px', borderRadius: '12px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxWidth: '800px', margin: '0 auto' },
    title: { margin: '0', fontSize: '3rem', color: '#fff', textAlign: 'center' },
    subtitle: { color: '#e50914', marginTop: '10px', marginBottom: '30px', fontSize: '1.2rem' },

    scoreboard: { display: 'flex', gap: '50px', marginBottom: '30px', backgroundColor: '#000', padding: '20px 40px', borderRadius: '12px', border: '2px solid #333' },
    scoreBox: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    score: { fontSize: '4rem', fontWeight: 'bold', color: '#4caf50' },

    roundResult: { textAlign: 'center', marginBottom: '40px', padding: '20px', backgroundColor: '#222', borderRadius: '8px', width: '100%' },

    controls: { display: 'flex', gap: '20px' },
    weaponBtn: { fontSize: '4rem', padding: '20px 30px', backgroundColor: '#333', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'transform 0.1s, background 0.2s' },

    matchWinnerBox: { textAlign: 'center', padding: '40px', backgroundColor: '#222', borderRadius: '12px', width: '100%', border: '2px solid #444' },
    resetButton: { marginTop: '20px', padding: '15px 30px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' },

    loading: { color: 'white', textAlign: 'center', marginTop: '50px' }
};