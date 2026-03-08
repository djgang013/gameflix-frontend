import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useGameTimer from '../hooks/useGameTimer';
import useGamepadExit from '../hooks/useGamepadExit';
export default function TicTacToe() {
    useGameTimer("TicTacToe(Java Edition)");
    useGamepadExit();
    const navigate = useNavigate();

    const [board, setBoard] = useState([
        ["", "", ""],
        ["", "", ""],
        ["", "", ""]
    ]);
    const [currentPlayer, setCurrentPlayer] = useState("X");
    const [winner, setWinner] = useState(null);
    const [isGameOver, setIsGameOver] = useState(false);
    const [loading, setLoading] = useState(true);

    // NEW: State to hold the leaderboard data
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        fetchBoard();
        fetchLeaderboard(); // Fetch high scores when the page loads
    }, []);

    const fetchBoard = async () => {
        try {
            const response = await api.get('/tictactoe/board');
            updateState(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load game", error);
        }
    };

    // NEW: Function to grab the Top 10 from Spring Boot
    const fetchLeaderboard = async () => {
        try {
            const res = await api.get('/stats/leaderboard/TicTacToe(Java Edition)');
            setLeaderboard(res.data)
        } catch (error) {
            console.error("Failed to load leaderboard", error);
        }
    };

    const handleSquareClick = async (row, col) => {
        if (board[row][col] !== "" || isGameOver) return;

        try {
            const response = await api.post('/tictactoe/move', { row, col });
            updateState(response.data);

            // Did the move end the game?
            if (response.data.gameOver) {

                // NEW: Did the player (X) actually win?
                if (response.data.winner === 'X') {
                    // Tell the Spring Boot backend to add +1 to our total wins!
                    await api.post('/stats/win', { gameName: "TicTacToe(Java Edition)" });
                }

                // Refresh the leaderboard to show the new score
                fetchLeaderboard();
            }
        } catch (error) {
            console.error("Failed to make move", error);
        }
    };
    const handleReset = async () => {
        try {
            const response = await api.post('/tictactoe/reset');
            updateState(response.data);
        } catch (error) {
            console.error("Failed to reset game", error);
        }
    };

    const updateState = (javaState) => {
        setBoard(javaState.board);
        setCurrentPlayer(javaState.currentPlayer);
        setWinner(javaState.winner);
        setIsGameOver(javaState.gameOver);
    };

    if (loading) return <h2 style={styles.loading}>Connecting to Java Engine...</h2>;

    return (
        <div style={styles.container}>
            {/* 1. Cinematic Vignette Overlay */}
            <div style={styles.overlay}></div>

            {/* 2. Premium Top Bar */}
            <div style={styles.topBar}>
                <button onClick={() => navigate('/games')} style={styles.backButton}>
                    ← Back to Library
                </button>
            </div>

            <div style={styles.mainLayout}>
                {/* LEFT SIDE: The Game (Now a Glass Panel) */}
                <div style={styles.gameWrapper}>
                    <h1 style={styles.title}>Java Tic-Tac-Toe</h1>

                    <div style={styles.status}>
                        {winner === "Draw" ? (
                            <h2 style={{ color: '#ccc', margin: 0 }}>It's a Draw!</h2>
                        ) : winner ? (
                            <h2 style={{ color: winner === 'X' ? '#4caf50' : '#e50914', margin: 0, textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                                {winner === 'X' ? 'You Win!' : 'AI Wins!'}
                            </h2>
                        ) : (
                            <h2 style={{ margin: 0, color: '#e5e5e5' }}>Your Turn (X)</h2>
                        )}
                    </div>

                    <div style={styles.board}>
                        {board.map((row, rowIndex) => (
                            row.map((cell, colIndex) => (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    style={styles.cell}
                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                >
                                    <span style={{
                                        color: cell === 'X' ? '#4caf50' : '#e50914', // X is green, AI is red
                                        fontSize: '3rem',
                                        fontWeight: 'bold',
                                        textShadow: '2px 2px 5px rgba(0,0,0,0.5)'
                                    }}>
                                        {cell}
                                    </span>
                                </div>
                            ))
                        ))}
                    </div>

                    {isGameOver && (
                        <button onClick={handleReset} style={styles.resetButton}>
                            Play Again
                        </button>
                    )}
                </div>

                {/* RIGHT SIDE: The Leaderboard (Now a Glass Panel) */}
                <div style={styles.leaderboardWrapper}>
                    <h2 style={styles.leaderboardTitle}>🏆 Hall of Fame</h2>
                    <p style={{ color: '#bbb', marginBottom: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
                        Defeat the AI to climb the ranks
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
    // --- MASSIVE CINEMATIC BACKGROUND ---
    container: {
        minHeight: '100vh',
        backgroundImage: 'url("https://images.unsplash.com/photo-1614294149010-950b698f72c0?q=80&w=2070&auto=format&fit=crop")', // Dark abstract gaming grid
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    },

    // --- RADIAL VIGNETTE ---
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.9) 100%)',
        zIndex: 1
    },

    topBar: { position: 'relative', zIndex: 2, padding: '30px 50px', width: '100%', boxSizing: 'border-box' },
    backButton: { backgroundColor: 'rgba(20,20,20,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', backdropFilter: 'blur(10px)', transition: 'all 0.2s ease', fontSize: '1rem' },

    mainLayout: { position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '60px', flexWrap: 'wrap', padding: '0 50px 50px' },

    // --- GAME PANEL (FROSTED GLASS) ---
    gameWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 15, 15, 0.6)', // Translucent dark
        backdropFilter: 'blur(16px)', // The magic blur!
        padding: '40px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)', // Subtle white rim
        boxShadow: '0 25px 50px rgba(0,0,0,0.8)' // Heavy drop shadow
    },
    title: { margin: '0 0 20px 0', fontSize: '2.5rem', color: '#fff', textShadow: '0 0 15px rgba(255,255,255,0.4)', fontWeight: '900' },
    status: { height: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center' },

    // The inner grid
    board: { display: 'grid', gridTemplateColumns: 'repeat(3, 100px)', gridTemplateRows: 'repeat(3, 100px)', gap: '10px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' },
    cell: { backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s', border: '1px solid rgba(255,255,255,0.1)' },
    resetButton: { marginTop: '30px', padding: '12px 24px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(229, 9, 20, 0.4)' },

    // --- LEADERBOARD PANEL (FROSTED GLASS) ---
    leaderboardWrapper: {
        width: '350px',
        backgroundColor: 'rgba(15, 15, 15, 0.6)', // Translucent dark
        backdropFilter: 'blur(16px)',
        padding: '30px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
    },
    leaderboardTitle: { margin: '0 0 10px 0', fontSize: '2rem', textAlign: 'center', color: '#f3ce13', textShadow: '0 0 10px rgba(243, 206, 19, 0.4)' },
    leaderboardList: { display: 'flex', flexDirection: 'column', gap: '10px' },

    // Sleek list items
    leaderboardItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: '12px 15px', borderRadius: '6px', borderLeft: '4px solid #4caf50', border: '1px solid rgba(255,255,255,0.05)' },
    rankBadge: { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' },

    loading: { color: 'white', textAlign: 'center', marginTop: '50px', position: 'relative', zIndex: 2 }
};