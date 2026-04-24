import { useState, useEffect } from 'react';
import api from '../services/api';

export default function EditGameModal({ isOpen, onClose, onGameUpdated, game }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [gameType, setGameType] = useState('CODED');
    const [sourceUrl, setSourceUrl] = useState('');
    const [assetPath, setAssetPath] = useState('');
    const [paid, setPaid] = useState(false);
    const [price, setPrice] = useState('0.00');

    // NEW: File upload states for editing
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    // When the modal opens, pre-fill all the inputs with the game's existing data!
    useEffect(() => {
        if (game) {
            const numericPrice = Number(game.price ?? 0);
            const hasPositivePrice = Number.isFinite(numericPrice) && numericPrice > 0;
            const paidFlag = typeof game.paid === 'boolean'
                ? game.paid
                : String(game.paid).toLowerCase() === 'true';
            const inferredPaid = paidFlag || game.gameType === 'CODED' || hasPositivePrice;

            setTitle(game.title || '');
            setDescription(game.description || '');
            setThumbnailUrl(game.thumbnailUrl || '');
            setGameType(game.gameType || 'CODED');
            setSourceUrl(game.sourceUrl || '');
            setAssetPath(game.assetPath || '');
            setPaid(inferredPaid);
            setPrice(game.price ?? (game.gameType === 'CODED' ? '5.00' : '0.00'));

            // Reset upload states when opening a new game
            setSelectedFile(null);
            setError('');
            setIsUploading(false);
        }
    }, [game]);

    if (!isOpen || !game) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        let finalImageUrl = thumbnailUrl;

        // 1. If they selected a NEW file, upload it to Spring Boot first!
        if (selectedFile) {
            // Safety check: Ensure file is under 10MB
            if (selectedFile.size > 10485760) {
                setError("Image is too large! Please choose a file under 10MB.");
                return;
            }

            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', selectedFile);

            // Grab the token to prove you are an Admin
            const token = localStorage.getItem('token');

            try {
                const uploadRes = await api.post('/upload/image', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`
                    }
                });

                finalImageUrl = uploadRes.data; // Use the new server-hosted URL
            } catch (err) {
                console.error("Image upload failed", err);
                setError("Failed to upload image. Please try a web link instead.");
                setIsUploading(false);
                return; // Stop the update process
            }
        }

        // 2. Send the PUT request with the updated game data
        try {
            await api.put(`/games/${game.id}`, {
                title,
                description,
                thumbnailUrl: finalImageUrl,
                gameType,
                paid,
                price: paid ? price : '0.00',
                sourceUrl,
                assetPath
            });

            setIsUploading(false);
            onGameUpdated(); // Refresh the dashboard!
            onClose(); // Close the modal
        } catch (err) {
            console.error(err);
            setError("Failed to update game.");
            setIsUploading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={{ marginTop: 0 }}>Edit Game</h2>

                {error && <p style={styles.error}>{error}</p>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <input style={styles.input} type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

                    <textarea style={styles.input} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" required />

                    {/* --- THE SPLIT IMAGE UPLOAD UI --- */}
                    <div style={styles.imageSection}>
                        <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px' }}>Poster Image (Choose ONE):</label>

                        {/* Option 1: File Upload */}
                        <div style={styles.fileUploadBox}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#aaa' }}>Upload new image from computer:</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    setSelectedFile(e.target.files[0]);
                                    setThumbnailUrl(''); // Clear URL if they upload a file
                                    setError('');
                                }}
                                style={{ color: 'white', fontSize: '0.9rem' }}
                            />
                        </div>

                        <p style={{ textAlign: 'center', margin: '5px 0', color: '#777', fontSize: '0.9rem' }}>OR</p>

                        {/* Option 2: Keep/Paste URL */}
                        <input
                            type="url"
                            placeholder="Current or new image URL..."
                            value={thumbnailUrl}
                            onChange={(e) => {
                                setThumbnailUrl(e.target.value);
                                setSelectedFile(null); // Clear file if they type a URL
                                setError('');
                            }}
                            style={styles.input}
                        />
                    </div>
                    {/* ---------------------------------- */}

                    <select style={styles.input} value={gameType} onChange={(e) => setGameType(e.target.value)}>
                        <option value="CODED">CODED (React Component)</option>
                        <option value="EMBEDDED">EMBEDDED (HTML5 iFrame)</option>
                    </select>

                    {gameType === 'CODED' ? (
                        <input style={styles.input} type="text" placeholder="Asset Path (e.g., /play/tictactoe)" value={assetPath} onChange={(e) => setAssetPath(e.target.value)} required />
                    ) : (
                        <input style={styles.input} type="text" placeholder="Source URL (e.g., https://...)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} required />
                    )}

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

                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} disabled={isUploading} style={styles.cancelButton}>Cancel</button>
                        <button type="submit" disabled={isUploading} style={{...styles.saveButton, opacity: isUploading ? 0.6 : 1}}>
                            {isUploading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
    modal: { backgroundColor: '#141414', padding: '30px', borderRadius: '8px', width: '400px', border: '1px solid #333', color: 'white', maxHeight: '90vh', overflowY: 'auto' }, // Added scroll protection just in case
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '10px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: 'white', width: '100%', boxSizing: 'border-box' },

    // UI styles for the image box
    imageSection: { display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '6px', border: '1px solid #444' },
    fileUploadBox: { backgroundColor: '#333', padding: '10px', borderRadius: '4px' },
    error: { color: '#e50914', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' },

    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
    cancelButton: { padding: '8px 16px', backgroundColor: 'transparent', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' },
    saveButton: { padding: '8px 16px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};