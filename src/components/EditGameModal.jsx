import { useState, useEffect } from 'react';
import api from '../services/api';

export default function EditGameModal({ isOpen, onClose, onGameUpdated, game }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [gameType, setGameType] = useState('CODED');
    const [sourceUrl, setSourceUrl] = useState('');
    const [assetPath, setAssetPath] = useState('');

    // When the modal opens, pre-fill all the inputs with the game's existing data!
    useEffect(() => {
        if (game) {
            setTitle(game.title || '');
            setDescription(game.description || '');
            setThumbnailUrl(game.thumbnailUrl || '');
            setGameType(game.gameType || 'CODED');
            setSourceUrl(game.sourceUrl || '');
            setAssetPath(game.assetPath || '');
        }
    }, [game]);

    if (!isOpen || !game) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/games/${game.id}`, {
                title, description, thumbnailUrl, gameType, sourceUrl, assetPath
            });
            onGameUpdated(); // Refresh the dashboard!
        } catch (err) {
            console.error(err);
            alert("Failed to update game.");
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={{ marginTop: 0 }}>Edit Game</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input style={styles.input} type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    <textarea style={styles.input} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" required />
                    <input style={styles.input} type="text" placeholder="Thumbnail URL" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} required />

                    <select style={styles.input} value={gameType} onChange={(e) => setGameType(e.target.value)}>
                        <option value="CODED">CODED (React Component)</option>
                        <option value="EMBEDDED">EMBEDDED (HTML5 iFrame)</option>
                    </select>

                    {gameType === 'CODED' ? (
                        <input style={styles.input} type="text" placeholder="Asset Path (e.g., /play/tictactoe)" value={assetPath} onChange={(e) => setAssetPath(e.target.value)} required />
                    ) : (
                        <input style={styles.input} type="text" placeholder="Source URL (e.g., https://...)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} required />
                    )}

                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} style={styles.cancelButton}>Cancel</button>
                        <button type="submit" style={styles.saveButton}>Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
    modal: { backgroundColor: '#141414', padding: '30px', borderRadius: '8px', width: '400px', border: '1px solid #333', color: 'white' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '10px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: 'white', width: '100%', boxSizing: 'border-box' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
    cancelButton: { padding: '8px 16px', backgroundColor: 'transparent', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' },
    saveButton: { padding: '8px 16px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};