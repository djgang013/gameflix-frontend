import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useGameTimer from '../hooks/useGameTimer';
import useGamepadExit from '../hooks/useGamepadExit';

export default function Rps() {
    useGameTimer("RPS: Extreme");
    useGamepadExit();
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
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchState();
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const res = await api.get('/stats/leaderboard/RPS: Extreme'); // USE YOUR EXACT RPS GAME NAME
            setLeaderboard(res.data);
        } catch (err) {
            console.error("Failed to fetch leaderboard", err);
        }
    };

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

            // NEW: Did this move win the entire match for the player?
            if (response.data.matchOver && response.data.matchWinner === 'PLAYER') {
                // Tell Java to add +1 to our RPS wins!
                await api.post('/stats/win', { gameName: "RPS: Extreme" });
                // Instantly refresh the leaderboard!
                fetchLeaderboard();
            }
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
        <div style={styles.wrapper}>
            {/* 1. Cinematic Vignette Overlay */}
            <div style={styles.overlay}></div>

            {/* 2. Premium Top Bar */}
            <div style={styles.topBar}>
                <button onClick={() => navigate('/games')} style={styles.backButton}>
                    ← Back to Library
                </button>
            </div>

            <div style={styles.content}>
                {/* LEFT: MAIN GAME PANEL */}
                <div style={styles.glassPanel}>
                    <h1 style={styles.title}>Rock, Paper, Scissors</h1>
                    <h3 style={styles.subtitle}>Extreme Edition: First to 3 Wins!</h3>

                    {/* SCOREBOARD */}
                    <div style={styles.scoreboard}>
                        <div style={styles.scoreBox}>
                            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.5rem', color: '#fff' }}>You</h2>
                            <span style={styles.score}>{gameState.playerScore}</span>
                        </div>
                        <div style={styles.scoreBox}>
                            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.5rem', color: '#fff' }}>Java AI</h2>
                            <span style={{...styles.score, color: '#e50914'}}>{gameState.computerScore}</span>
                        </div>
                    </div>

                    {/* MATCH WINNER ANNOUNCEMENT */}
                    {gameState.matchOver ? (
                        <div style={styles.matchWinnerBox}>
                            <h1 style={{
                                color: gameState.matchWinner === 'PLAYER' ? '#4caf50' : '#e50914',
                                fontSize: '3rem',
                                margin: 0,
                                textShadow: '0 0 15px rgba(0,0,0,0.8)'
                            }}>
                                {gameState.matchWinner === 'PLAYER' ? '🏆 YOU WIN THE MATCH! 🏆' : '💀 JAVA AI WINS! 💀'}
                            </h1>
                            <p style={{ color: '#ccc', marginTop: '15px', fontSize: '1.1rem' }}>
                                {gameState.matchWinner === 'PLAYER' ? 'Your victory has been recorded on the Leaderboard.' : 'Better luck next time...'}
                            </p>
                            <button onClick={handleReset} style={styles.resetButton}>Play Again</button>
                        </div>
                    ) : (
                        <>
                            {/* ROUND RESULT (Frosted inset box) */}
                            {gameState.lastPlayerChoice && (
                                <div style={styles.roundResult}>
                                    <p style={{ fontSize: '1.5rem', margin: '0 0 15px 0', color: '#e5e5e5' }}>
                                        You played <strong style={{fontSize: '2rem'}}>{getEmoji(gameState.lastPlayerChoice)}</strong> vs AI's <strong style={{fontSize: '2rem'}}>{getEmoji(gameState.lastComputerChoice)}</strong>
                                    </p>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: '2rem',
                                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                                        color: gameState.roundResult === 'WIN' ? '#4caf50' : gameState.roundResult === 'LOSE' ? '#e50914' : '#aaa'
                                    }}>
                                        {gameState.roundResult === 'WIN' ? '+1 Point to You!' : gameState.roundResult === 'LOSE' ? '+1 Point to AI!' : "It's a Tie!"}
                                    </h2>
                                </div>
                            )}

                            {/* WEAPON BUTTONS */}
                            <div style={styles.controls}>
                                <button className="weapon-btn" style={styles.weaponBtn} onClick={() => handlePlay('ROCK')}>🪨</button>
                                <button className="weapon-btn" style={styles.weaponBtn} onClick={() => handlePlay('PAPER')}>📄</button>
                                <button className="weapon-btn" style={styles.weaponBtn} onClick={() => handlePlay('SCISSORS')}>✂️</button>
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT: THE LEADERBOARD PANEL */}
                <div style={styles.leaderboardWrapper}>
                    <h2 style={styles.leaderboardTitle}>🏆 Hall of Fame</h2>
                    <p style={{ color: '#bbb', marginBottom: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
                        First to 3 Wins the Match
                    </p>

                    <div style={styles.leaderboardList}>
                        {leaderboard.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#888' }}>No winners yet...</p>
                        ) : (
                            leaderboard.map((player, index) => (
                                <div key={player.id} style={styles.leaderboardItem}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <span style={styles.rankBadge}>#{index + 1}</span>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>{player.username}</span>
                                    </div>
                                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{player.wins} Wins</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        minHeight: '100vh',
        backgroundImage: 'url("https://images.unsplash.com/photo-1614294149010-950b698f72c0?q=80&w=2070&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    },

    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.9) 100%)',
        zIndex: 1
    },

    topBar: { position: 'relative', zIndex: 2, padding: '30px 50px', width: '100%', boxSizing: 'border-box' },
    backButton: { backgroundColor: 'rgba(20,20,20,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', backdropFilter: 'blur(10px)', transition: 'all 0.2s ease', fontSize: '1rem' },

    // Notice we added gap and flexWrap here to make them sit side-by-side!
    content: { position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '60px', flexWrap: 'wrap', flex: 1, padding: '0 50px 50px' },

    glassPanel: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 15, 15, 0.6)',
        backdropFilter: 'blur(16px)',
        padding: '50px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
        width: '100%',
        maxWidth: '700px'
    },

    title: { margin: '0', fontSize: '3.5rem', color: '#fff', textAlign: 'center', textShadow: '0 0 15px rgba(255,255,255,0.4)', fontWeight: '900' },
    subtitle: { color: '#e50914', marginTop: '10px', marginBottom: '40px', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px', textShadow: '0 0 10px rgba(229, 9, 20, 0.5)' },

    scoreboard: { display: 'flex', justifyContent: 'center', gap: '80px', marginBottom: '40px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px 60px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', width: '100%', boxSizing: 'border-box' },
    scoreBox: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    score: { fontSize: '5rem', fontWeight: 'bold', color: '#4caf50', lineHeight: '1', textShadow: '2px 2px 10px rgba(0,0,0,0.8)' },

    roundResult: { textAlign: 'center', marginBottom: '40px', padding: '25px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '12px', width: '100%', border: '1px solid rgba(255,255,255,0.05)', boxSizing: 'border-box' },

    controls: { display: 'flex', gap: '25px' },
    weaponBtn: { fontSize: '4rem', padding: '20px 30px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s ease', backdropFilter: 'blur(4px)' },

    matchWinnerBox: { textAlign: 'center', padding: '40px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '12px', width: '100%', border: '1px solid rgba(255,255,255,0.1)', boxSizing: 'border-box', backdropFilter: 'blur(8px)' },
    resetButton: { marginTop: '30px', padding: '15px 40px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)', transition: 'transform 0.2s' },

    // --- LEADERBOARD PANEL (FROSTED GLASS) ---
    leaderboardWrapper: {
        width: '350px',
        backgroundColor: 'rgba(15, 15, 15, 0.6)',
        backdropFilter: 'blur(16px)',
        padding: '30px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
    },
    leaderboardTitle: { margin: '0 0 10px 0', fontSize: '2rem', textAlign: 'center', color: '#f3ce13', textShadow: '0 0 10px rgba(243, 206, 19, 0.4)' },
    leaderboardList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    leaderboardItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: '12px 15px', borderRadius: '6px', borderLeft: '4px solid #4caf50', border: '1px solid rgba(255,255,255,0.05)' },
    rankBadge: { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' },

    loading: { color: 'white', textAlign: 'center', marginTop: '50px', position: 'relative', zIndex: 2 }
};