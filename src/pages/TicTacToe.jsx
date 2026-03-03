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
            const response = await api.get('/tictactoe/leaderboard');
            setLeaderboard(response.data);
        } catch (error) {
            console.error("Failed to load leaderboard", error);
        }
    };

    const handleSquareClick = async (row, col) => {
        if (board[row][col] !== "" || isGameOver) return;

        try {
            const response = await api.post('/tictactoe/move', { row, col });
            updateState(response.data);

            // If the move ended the game, refresh the leaderboard to show the new score!
            if (response.data.gameOver) {
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
            <button onClick={() => navigate('/games')} style={styles.backButton}>
                ← Back to Library
            </button>

            <div style={styles.mainLayout}>
                {/* LEFT SIDE: The Game */}
                <div style={styles.gameWrapper}>
                    <h1 style={styles.title}>Java Tic-Tac-Toe</h1>

                    <div style={styles.status}>
                        {winner === "Draw" ? (
                            <h2 style={{ color: '#aaa' }}>It's a Draw!</h2>
                        ) : winner ? (
                            <h2 style={{ color: winner === 'X' ? '#4caf50' : '#e50914' }}>
                                {winner === 'X' ? 'You Win!' : 'AI Wins!'}
                            </h2>
                        ) : (
                            <h2>Your Turn (X)</h2>
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
                                        fontWeight: 'bold'
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

                {/* RIGHT SIDE: The Leaderboard */}
                <div style={styles.leaderboardWrapper}>
                    <h2 style={styles.leaderboardTitle}>🏆 Hall of Fame</h2>
                    <p style={{ color: '#aaa', marginBottom: '20px', textAlign: 'center' }}>
                        Defeat the AI to climb the ranks
                    </p>

                    <div style={styles.leaderboardList}>
                        {leaderboard.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#666' }}>No winners yet...</p>
                        ) : (
                            leaderboard.map((player, index) => (
                                <div key={player.id} style={styles.leaderboardItem}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <span style={styles.rankBadge}>#{index + 1}</span>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{player.username}</span>
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
    container: { padding: '30px', backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    backButton: { padding: '10px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '30px', transition: 'background 0.2s' },
    mainLayout: { display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '60px', flexWrap: 'wrap' },

    // Game Styles
    gameWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#1c1c1c', padding: '40px', borderRadius: '12px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    title: { margin: '0 0 20px 0', fontSize: '2.5rem', color: '#fff' },
    status: { height: '40px', marginBottom: '20px' },
    board: { display: 'grid', gridTemplateColumns: 'repeat(3, 100px)', gridTemplateRows: 'repeat(3, 100px)', gap: '10px', backgroundColor: '#333', padding: '10px', borderRadius: '8px' },
    cell: { backgroundColor: '#222', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s' },
    resetButton: { marginTop: '30px', padding: '12px 24px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' },

    // Leaderboard Styles
    leaderboardWrapper: { width: '350px', backgroundColor: '#1c1c1c', padding: '30px', borderRadius: '12px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    leaderboardTitle: { margin: '0', fontSize: '2rem', textAlign: 'center', color: '#f3ce13' },
    leaderboardList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    leaderboardItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2a2a2a', padding: '12px 15px', borderRadius: '6px', borderLeft: '4px solid #4caf50' },
    rankBadge: { backgroundColor: '#444', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' },

    loading: { color: 'white', textAlign: 'center', marginTop: '50px' }
};