import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useGameTimer from '../hooks/useGameTimer';
import useGamepadExit from '../hooks/useGamepadExit';
import GameSocialSection from '../components/GameSocialSection';
export default function Wordle() {
    useGameTimer("Tech Wordle");
    useGamepadExit();
    const navigate = useNavigate();

    const [gameState, setGameState] = useState({
        guesses: [],
        colors: [],
        gameOver: false,
        gameWon: false,
        message: "Loading..."
    });

    const [currentGuess, setCurrentGuess] = useState("");
    const [loading, setLoading] = useState(true);

    // Standard QWERTY keyboard layout
    const keyboardRows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];

    useEffect(() => {
        fetchState();
    }, []);

    const fetchState = async () => {
        try {
            const response = await api.get('/wordle/state');
            setGameState(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load Wordle state", error);
        }
    };

    // --- GAME LOGIC ---
    const submitGuess = async () => {
        if (gameState.gameOver || currentGuess.length !== 5) return;

        try {
            const response = await api.post('/wordle/guess', { guess: currentGuess });
            setGameState(response.data);
            setCurrentGuess("");
        } catch (error) {
            console.error("Failed to make guess", error);
        }
    };

    const handleKeyPress = useCallback((key) => {
        if (gameState.gameOver) return;

        if (key === 'ENTER') {
            submitGuess();
        } else if (key === '⌫' || key === 'BACKSPACE') {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
            setCurrentGuess(prev => prev + key);
        }
    }, [currentGuess, gameState.gameOver]);

    // Listen for physical keyboard typing
    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toUpperCase();
            if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
                handleKeyPress(key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyPress]);

    const handleReset = async () => {
        try {
            const response = await api.post('/wordle/reset');
            setGameState(response.data);
            setCurrentGuess("");
        } catch (error) {
            console.error("Failed to reset game", error);
        }
    };

    // --- KEYBOARD COLOR ALGORITHM ---
    // Calculates the "best" color for every letter based on past guesses
    const getLetterColors = () => {
        const letterColors = {};

        gameState.guesses.forEach((word, rowIndex) => {
            word.split('').forEach((letter, colIndex) => {
                const color = gameState.colors[rowIndex][colIndex];
                const existingColor = letterColors[letter];

                // Priority: GREEN > YELLOW > GRAY
                if (color === 'GREEN') {
                    letterColors[letter] = '#538d4e';
                } else if (color === 'YELLOW' && existingColor !== '#538d4e') {
                    letterColors[letter] = '#b59f3b';
                } else if (color === 'GRAY' && existingColor !== '#538d4e' && existingColor !== '#b59f3b') {
                    letterColors[letter] = '#3a3a3c';
                }
            });
        });

        return letterColors;
    };

    if (loading) return <h2 style={styles.loading}>Connecting to Java Engine...</h2>;

    const rows = Array.from({ length: 6 });
    const keyColors = getLetterColors();

    return (
        <div style={styles.container}>
            <button onClick={() => navigate('/games')} style={styles.backButton}>
                ← Back to Library
            </button>

            <div style={styles.gameWrapper}>
                <h1 style={styles.title}>TECH WORDLE</h1>

                <h3 style={{
                    color: gameState.gameWon ? '#4caf50' : gameState.gameOver ? '#e50914' : '#aaa',
                    marginBottom: '20px',
                    fontSize: '1.2rem',
                    height: '24px' // Keeps layout from jumping
                }}>
                    {gameState.message}
                </h3>

                {/* THE 6x5 GRID */}
                <div style={styles.grid}>
                    {rows.map((_, rowIndex) => {
                        const isGuessed = rowIndex < gameState.guesses.length;
                        const isActiveRow = rowIndex === gameState.guesses.length && !gameState.gameOver;

                        const displayWord = isGuessed ? gameState.guesses[rowIndex] : (isActiveRow ? currentGuess.padEnd(5, ' ') : "     ");
                        const rowColors = isGuessed ? gameState.colors[rowIndex] : [];

                        return (
                            <div key={rowIndex} style={styles.row}>
                                {displayWord.split('').map((letter, colIndex) => {
                                    let bgColor = '#121213';
                                    let borderColor = '#3a3a3c';

                                    if (isGuessed) {
                                        borderColor = 'transparent';
                                        if (rowColors[colIndex] === 'GREEN') bgColor = '#538d4e';
                                        else if (rowColors[colIndex] === 'YELLOW') bgColor = '#b59f3b';
                                        else if (rowColors[colIndex] === 'GRAY') bgColor = '#3a3a3c';
                                    } else if (letter !== ' ') {
                                        borderColor = '#565758';
                                    }

                                    return (
                                        <div key={colIndex} style={{...styles.cell, backgroundColor: bgColor, borderColor: borderColor}}>
                                            {letter.toUpperCase()}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* THE VIRTUAL KEYBOARD */}
                <div style={styles.keyboard}>
                    {keyboardRows.map((row, rowIndex) => (
                        <div key={rowIndex} style={styles.keyboardRow}>
                            {row.map((key) => {
                                const isActionKey = key === 'ENTER' || key === '⌫';
                                const bgColor = keyColors[key] || '#818384'; // Default grey for unused keys

                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleKeyPress(key)}
                                        style={{
                                            ...styles.key,
                                            backgroundColor: bgColor,
                                            flex: isActionKey ? 1.5 : 1, // Action keys are wider
                                            fontSize: isActionKey ? '0.9rem' : '1.2rem'
                                        }}
                                    >
                                        {key}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* RESET BUTTON */}
                {gameState.gameOver && (
                    <button onClick={handleReset} style={styles.resetButton}>
                        Play Again
                    </button>
                )}
            </div>

            <div style={styles.bottomSocialSection}>
                <GameSocialSection
                    gameAssetPath="/play/wordle"
                    gameTitleCandidates={["Wordle", "Tech Wordle"]}
                />
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '30px', backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    backButton: { padding: '10px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' },
    gameWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#1c1c1c', padding: '30px', borderRadius: '12px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxWidth: '500px', margin: '0 auto' },
    title: { margin: '0 0 10px 0', fontSize: '2.5rem', color: '#fff', letterSpacing: '4px', fontWeight: 'bold' },

    grid: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px' },
    row: { display: 'flex', gap: '5px' },
    cell: { width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem', fontWeight: 'bold', border: '2px solid', color: '#fff' },

    // Keyboard Styles
    keyboard: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '10px', marginBottom: '20px' },
    keyboardRow: { display: 'flex', gap: '6px', justifyContent: 'center', width: '100%' },
    key: { height: '58px', border: 'none', borderRadius: '4px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'background-color 0.2s' },

    resetButton: { padding: '15px 30px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', width: '100%' },
    bottomSocialSection: { width: '100%', maxWidth: '900px', margin: '20px auto 0 auto' },
    loading: { color: 'white', textAlign: 'center', marginTop: '50px' }
};