import { useState } from 'react';
import api from '../services/api';

export default function AddGameModal({ isOpen, onClose, onGameAdded }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [gameType, setGameType] = useState('EMBEDDED');
    const [gameLink, setGameLink] = useState('');
    const [paid, setPaid] = useState(false);
    const [price, setPrice] = useState('5.00');
    const [error, setError] = useState('');

    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedFile && !thumbnailUrl) {
            setError("Please upload an image OR paste a URL.");
            return;
        }

        let finalImageUrl = thumbnailUrl;

        if (selectedFile) {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', selectedFile);

            // --- FIX: GRAB THE TOKEN TO PROVE YOU ARE AN ADMIN ---
            // Grab the token
            const token = localStorage.getItem('token');

            try {
                const uploadRes = await api.post('/upload/image', formData, {
                    headers: {
                        // REMOVE the manual Content-Type line! Let Axios do the magic.
                        'Authorization': `Bearer ${token}` // Just pass the token
                    }
                });

                finalImageUrl = uploadRes.data;
            } catch (err) {
                console.error("Image upload failed", err);
                setError("Failed to upload image. Please try a web link instead.");
                setIsUploading(false);
                return;
            }
        }

        const newGame = {
            title,
            description,
            thumbnailUrl: finalImageUrl,
            gameType,
            paid,
            price: paid ? price : '0.00'
        };

        if (gameType === 'EMBEDDED') {
            newGame.sourceUrl = gameLink;
        } else {
            newGame.assetPath = gameLink;
        }

        try {
            await api.post('/games', newGame);

            // Clean up all fields
            setTitle('');
            setDescription('');
            setThumbnailUrl('');
            setGameLink('');
            setPaid(false);
            setPrice('0.00');
            setSelectedFile(null);
            setIsUploading(false);

            onGameAdded();
        } catch (err) {
            console.error(err);
            setIsUploading(false);
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

                    <div style={styles.imageSection}>
                        <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px' }}>Poster Image (Choose ONE):</label>

                        {/* Option 1: File Upload */}
                        <div style={styles.fileUploadBox}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#aaa' }}>Upload from computer:</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    setSelectedFile(e.target.files[0]);
                                    setThumbnailUrl('');
                                    setError('');
                                }}
                                style={{ color: 'white', fontSize: '0.9rem' }}
                            />
                        </div>

                        <p style={{ textAlign: 'center', margin: '5px 0', color: '#777', fontSize: '0.9rem' }}>OR</p>

                        <input
                            type="url"
                            placeholder="Paste a web image URL instead..."
                            value={thumbnailUrl}
                            onChange={(e) => {
                                setThumbnailUrl(e.target.value);
                                setSelectedFile(null);
                            }}
                            style={styles.input}
                        />
                    </div>

                    <select value={gameType} onChange={(e) => setGameType(e.target.value)} style={styles.input}>
                        <option value="EMBEDDED">Embedded Web Game (URL)</option>
                        <option value="CODED">Custom Coded Game (File Path)</option>
                    </select>

                    <input type="text" required placeholder={gameType === 'EMBEDDED' ? "https://example.com/game" : "/assets/games/mygame.js"} value={gameLink} onChange={(e) => setGameLink(e.target.value)} style={styles.input} />

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', color: '#ddd' }}>
                        <input
                            type="checkbox"
                            checked={paid}
                            onChange={(e) => {
                                const next = e.target.checked;
                                setPaid(next);
                                if (!next) {
                                    setPrice('0.00');
                                } else {
                                    setPrice('5.00');
                                }
                            }}
                        />
                        Paid game
                    </label>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!paid}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Price in USD"
                        style={{ ...styles.input, opacity: paid ? 1 : 0.6 }}
                    />

                    <div style={styles.buttonRow}>
                        <button type="button" onClick={onClose} disabled={isUploading} style={styles.cancelButton}>Cancel</button>
                        <button type="submit" disabled={isUploading} style={{...styles.submitButton, opacity: isUploading ? 0.6 : 1}}>
                            {isUploading ? 'Uploading...' : 'Save Game'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: '#222', padding: '30px', borderRadius: '8px', width: '400px', color: 'white', border: '1px solid #444' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' },
    input: { padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#333', color: 'white', width: '100%', boxSizing: 'border-box' },

    imageSection: { display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '6px', border: '1px solid #444' },
    fileUploadBox: { backgroundColor: '#333', padding: '10px', borderRadius: '4px' },

    buttonRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
    cancelButton: { padding: '10px 15px', backgroundColor: 'transparent', color: 'white', border: '1px solid white', borderRadius: '4px', cursor: 'pointer' },
    submitButton: { padding: '10px 15px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    error: { color: '#e50914', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }
};