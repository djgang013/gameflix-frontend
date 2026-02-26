import { useState } from 'react';
import api from '../services/api';

export default function AddGameModal({ isOpen, onClose, onGameAdded }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    // 1. ADD THE THUMBNAIL STATE
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [gameType, setGameType] = useState('EMBEDDED');
    const [gameLink, setGameLink] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 2. INCLUDE THUMBNAIL IN THE PAYLOAD
        const newGame = {
            title,
            description,
            thumbnailUrl,
            gameType
        };

        if (gameType === 'EMBEDDED') {
            newGame.sourceUrl = gameLink;
        } else {
            newGame.assetPath = gameLink;
        }

        try {
            await api.post('/games', newGame);

            setTitle('');
            setDescription('');
            setThumbnailUrl(''); // Clear the field
            setGameLink('');

            onGameAdded();
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 403) {
                setError("Access Denied: You must be an Admin to add games.");
            } else {
                setError("Failed to add game. Check your connection.");
            }
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2>Add a New Game</h2>
                {error && <p style={styles.error}>{error}</p>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <input type="text" placeholder="Game Title" required value={title} onChange={(e) => setTitle(e.target.value)} style={styles.input} />

                    <textarea placeholder="Description" required rows="2" value={description} onChange={(e) => setDescription(e.target.value)} style={styles.input} />

                    {/* 3. ADD THE IMAGE INPUT FIELD */}
                    <input type="url" placeholder="Image URL (e.g. https://.../image.jpg)" required value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} style={styles.input} />

                    <select value={gameType} onChange={(e) => setGameType(e.target.value)} style={styles.input}>
                        <option value="EMBEDDED">Embedded Web Game (URL)</option>
                        <option value="CODED">Custom Coded Game (File Path)</option>
                    </select>

                    <input type="text" required placeholder={gameType === 'EMBEDDED' ? "https://example.com/game" : "/assets/games/mygame.js"} value={gameLink} onChange={(e) => setGameLink(e.target.value)} style={styles.input} />

                    <div style={styles.buttonRow}>
                        <button type="button" onClick={onClose} style={styles.cancelButton}>Cancel</button>
                        <button type="submit" style={styles.submitButton}>Save Game</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ... keep your existing styles at the bottom ...
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: '#222', padding: '30px', borderRadius: '8px', width: '400px', color: 'white', border: '1px solid #444' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' },
    input: { padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#333', color: 'white' },
    buttonRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
    cancelButton: { padding: '10px 15px', backgroundColor: 'transparent', color: 'white', border: '1px solid white', borderRadius: '4px', cursor: 'pointer' },
    submitButton: { padding: '10px 15px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    error: { color: '#e50914', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }
};