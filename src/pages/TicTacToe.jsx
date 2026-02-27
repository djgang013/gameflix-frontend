import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function TicTacToe() {
    const navigate = useNavigate();

    // React only holds the state that Spring Boot gives it
    const [board, setBoard] = useState([
        ["", "", ""],
        ["", "", ""],
        ["", "", ""]
    ]);
    const [currentPlayer, setCurrentPlayer] = useState("X");
    const [winner, setWinner] = useState(null);
    const [isGameOver, setIsGameOver] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. Fetch the initial board from Java when the page loads
    useEffect(() => {
        fetchBoard();
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

    // 2. Send the player's move to the Java backend
    const handleSquareClick = async (row, col) => {
        // Prevent clicking if the spot is taken or the game is over
        if (board[row][col] !== "" || isGameOver) return;

        try {
            const response = await api.post('/tictactoe/move', { row, col });
            updateState(response.data);
        } catch (error) {
            console.error("Failed to make move", error);
        }
    };

    // 3. Tell Java to reset the game
    const handleReset = async () => {
        try {
            const response = await api.post('/tictactoe/reset');
            updateState(response.data);
        } catch (error) {
            console.error("Failed to reset game", error);
        }
    };

    // Helper function to sync React's state with Java's state
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

            <div style={styles.gameWrapper}>
                <h1 style={styles.title}>Java Tic-Tac-Toe</h1>

                {/* Status Message */}
                <div style={styles.status}>
                    {winner === "Draw" ? (
                        <h2 style={{ color: '#aaa' }}>It's a Draw!</h2>
                    ) : winner ? (
                        <h2 style={{ color: '#4caf50' }}>Player {winner} Wins!</h2>
                    ) : (
                        <h2>Player {currentPlayer}'s Turn</h2>
                    )}
                </div>

                {/* The 3x3 Grid */}
                <div style={styles.board}>
                    {board.map((row, rowIndex) => (
                        row.map((cell, colIndex) => (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                style={styles.cell}
                                onClick={() => handleSquareClick(rowIndex, colIndex)}
                            >
                                <span style={{
                                    color: cell === 'X' ? '#e50914' : '#66c0f4',
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
        </div>
    );
}

const styles = {
    container: { padding: '20px', backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: 'Arial' },
    backButton: { padding: '10px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' },
    gameWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' },
    title: { margin: '0 0 20px 0', fontSize: '2.5rem', textShadow: '2px 2px 4px #000' },
    status: { height: '50px', marginBottom: '20px' },
    board: { display: 'grid', gridTemplateColumns: 'repeat(3, 100px)', gridTemplateRows: 'repeat(3, 100px)', gap: '10px', backgroundColor: '#333', padding: '10px', borderRadius: '8px' },
    cell: { backgroundColor: '#222', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s' },
    resetButton: { marginTop: '30px', padding: '12px 24px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' },
    loading: { color: 'white', textAlign: 'center', marginTop: '50px' }
};