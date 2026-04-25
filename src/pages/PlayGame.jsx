import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useGameTimer from '../hooks/useGameTimer';
import useGamepadExit from '../hooks/useGamepadExit';

export default function PlayGame() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [summary, setSummary] = useState({ averageRating: null, ratingCount: 0, userRating: null, favorite: false });
    const [comments, setComments] = useState([]);
    const [commentDraft, setCommentDraft] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentContent, setEditingCommentContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [socialError, setSocialError] = useState('');

    useGameTimer(game ? game.title : null);
    useGamepadExit();

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const response = await api.get(`/games/${id}`);
                setGame(response.data);

                const [summaryResponse, commentsResponse] = await Promise.all([
                    api.get(`/social/games/${id}/summary`),
                    api.get(`/social/games/${id}/comments`)
                ]);

                setSummary(summaryResponse.data || { averageRating: null, ratingCount: 0, userRating: null, favorite: false });
                setComments(commentsResponse.data || []);
            } catch (err) {
                console.error(err);
                setError('Failed to load the game. It might have been deleted.');
            } finally {
                setLoading(false);
            }
        };

        fetchGame();
    }, [id]);

    const stars = useMemo(() => Array.from({ length: 5 }, (_, index) => index + 1), []);

    const refreshSocial = async () => {
        const [summaryResponse, commentsResponse] = await Promise.all([
            api.get(`/social/games/${id}/summary`),
            api.get(`/social/games/${id}/comments`)
        ]);

        setSummary(summaryResponse.data || { averageRating: null, ratingCount: 0, userRating: null, favorite: false });
        setComments(commentsResponse.data || []);
    };

    const handleFavoriteToggle = async () => {
        try {
            if (summary.favorite) {
                await api.delete(`/social/games/${id}/favorite`);
            } else {
                await api.post(`/social/games/${id}/favorite`);
            }
            await refreshSocial();
        } catch {
            setSocialError('Could not update favorites.');
        }
    };

    const handleRating = async (rating) => {
        try {
            const response = await api.post(`/social/games/${id}/rating`, { rating });
            setSummary(response.data);
        } catch {
            setSocialError('Could not save your rating.');
        }
    };

    const handleAddComment = async (event) => {
        event.preventDefault();
        if (!commentDraft.trim()) {
            setSocialError('Write a comment first.');
            return;
        }

        try {
            await api.post(`/social/games/${id}/comments`, { content: commentDraft });
            setCommentDraft('');
            setSocialError('');
            await refreshSocial();
        } catch {
            setSocialError('Could not post your comment.');
        }
    };

    const startEditingComment = (comment) => {
        setEditingCommentId(comment.commentId);
        setEditingCommentContent(comment.content);
    };

    const cancelEditingComment = () => {
        setEditingCommentId(null);
        setEditingCommentContent('');
    };

    const saveComment = async (commentId) => {
        if (!editingCommentContent.trim()) {
            setSocialError('Comment cannot be empty.');
            return;
        }

        try {
            await api.put(`/social/comments/${commentId}`, { content: editingCommentContent });
            cancelEditingComment();
            await refreshSocial();
        } catch {
            setSocialError('Could not update the comment.');
        }
    };

    const deleteComment = async (commentId) => {
        try {
            await api.delete(`/social/comments/${commentId}`);
            await refreshSocial();
        } catch {
            setSocialError('Could not delete the comment.');
        }
    };

    const renderFilledStars = (value) => {
        const filled = Math.round(value || 0);
        return stars.map((star) => (
            <button key={star} style={styles.starButton} onClick={() => handleRating(star)} title={`Rate ${star} star${star > 1 ? 's' : ''}`}>
                <span style={{ color: star <= filled ? '#f5c518' : '#444' }}>★</span>
            </button>
        ));
    };

    if (loading) return <h2 style={styles.loading}>Loading your game...</h2>;
    if (error) return <h2 style={styles.error}>{error}</h2>;
    if (!game) return null;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate('/games')} style={styles.backButton}>← Back to Library</button>
                <div style={styles.headerTitleGroup}>
                    <h1 style={styles.title}>{game.title}</h1>
                    <div style={styles.summaryLine}>
                        <span style={styles.summaryPill}>{summary.ratingCount || 0} rating{(summary.ratingCount || 0) === 1 ? '' : 's'}</span>
                        <span style={styles.summaryPill}>{(summary.averageRating || 0).toFixed(1)} avg</span>
                        <button style={summary.favorite ? styles.favoriteButtonActive : styles.favoriteButton} onClick={handleFavoriteToggle}>
                            {summary.favorite ? '♥ Favorited' : '♡ Favorite'}
                        </button>
                    </div>
                </div>
            </div>

            <div style={styles.gameWrapper}>
                {game.gameType === 'EMBEDDED' ? (
                    <iframe src={game.sourceUrl} style={styles.iframe} title={game.title} allowFullScreen />
                ) : (
                    <div style={styles.placeholder}>
                        <h2>Custom Game Code Detected</h2>
                        <p>File Path: {game.assetPath}</p>
                        <button style={styles.primaryButton} onClick={() => navigate(game.assetPath || '/games')}>Launch game</button>
                        <p>*(We will build the custom JS game engine later!)*</p>
                    </div>
                )}
            </div>

            <div style={styles.socialGrid}>
                <section style={styles.panel}>
                    <h2 style={styles.panelTitle}>Rate this game</h2>
                    <p style={styles.panelText}>Tap a star to save or update your personal rating.</p>
                    <div style={styles.starRow}>{renderFilledStars(summary.userRating || 0)}</div>
                </section>

                <section style={styles.panel}>
                    <h2 style={styles.panelTitle}>Comments</h2>
                    <form onSubmit={handleAddComment} style={styles.commentForm}>
                        <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Leave a comment about this game..." style={styles.textarea} />
                        <button type="submit" style={styles.primaryButton}>Post comment</button>
                    </form>

                    {socialError && <p style={styles.socialError}>{socialError}</p>}

                    <div style={styles.commentList}>
                        {comments.length === 0 ? (
                            <p style={styles.panelText}>No comments yet.</p>
                        ) : comments.map((comment) => (
                            <article key={comment.commentId} style={styles.commentCard}>
                                <div style={styles.commentHeader}>
                                    <div style={styles.commentAuthorRow}>
                                        <img src={comment.avatarUrl || `https://ui-avatars.com/api/?name=${comment.displayName || comment.username}&background=e50914&color=fff&size=44&bold=true`} alt="Avatar" style={styles.commentAvatar} />
                                        <div>
                                            <strong>{comment.displayName || comment.username}</strong>
                                            <div style={styles.commentMeta}>{new Date(comment.createdAt).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    {comment.mine && editingCommentId !== comment.commentId && (
                                        <div style={styles.commentActions}>
                                            <button type="button" style={styles.textActionButton} onClick={() => startEditingComment(comment)}>Edit</button>
                                            <button type="button" style={styles.textActionButtonDanger} onClick={() => deleteComment(comment.commentId)}>Delete</button>
                                        </div>
                                    )}
                                </div>

                                {editingCommentId === comment.commentId ? (
                                    <div style={styles.editBlock}>
                                        <textarea value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} style={styles.textarea} />
                                        <div style={styles.editActions}>
                                            <button type="button" style={styles.primaryButton} onClick={() => saveComment(comment.commentId)}>Save</button>
                                            <button type="button" style={styles.secondaryButton} onClick={cancelEditingComment}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={styles.commentBody}>{comment.content}</p>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '20px', background: 'radial-gradient(circle at top, #0b1220 0%, #05070c 100%)', minHeight: '100vh', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    header: { display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' },
    headerTitleGroup: { display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 },
    backButton: { padding: '10px 15px', backgroundColor: '#1f2937', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', cursor: 'pointer', fontWeight: 'bold' },
    title: { margin: 0, fontSize: '2.5rem' },
    summaryLine: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
    summaryPill: { padding: '6px 10px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#d9e0ea', fontSize: '0.9rem' },
    favoriteButton: { padding: '8px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.06)', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    favoriteButtonActive: { padding: '8px 14px', borderRadius: '999px', border: '1px solid rgba(229, 9, 20, 0.45)', backgroundColor: 'rgba(229, 9, 20, 0.18)', color: '#ffb2b7', cursor: 'pointer', fontWeight: 'bold' },
    gameWrapper: { width: '100%', height: '80vh', backgroundColor: '#141414', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    iframe: { width: '100%', height: '100%', border: 'none' },
    placeholder: { textAlign: 'center', color: '#aaa', padding: '20px' },
    socialGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' },
    panel: { backgroundColor: 'rgba(8, 12, 19, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '20px' },
    panelTitle: { marginTop: 0, marginBottom: '8px' },
    panelText: { marginTop: 0, color: '#aab4c3' },
    starRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    starButton: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.8rem', padding: 0, lineHeight: 1 },
    commentForm: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
    textarea: { minHeight: '110px', resize: 'vertical', width: '100%', boxSizing: 'border-box', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.14)', backgroundColor: '#101826', color: 'white', padding: '12px', fontFamily: 'inherit' },
    primaryButton: { padding: '10px 14px', borderRadius: '12px', border: 'none', backgroundColor: '#e50914', color: 'white', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-start' },
    secondaryButton: { padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.18)', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    socialError: { color: '#ff9f9f', marginTop: '0' },
    commentList: { display: 'flex', flexDirection: 'column', gap: '14px' },
    commentCard: { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' },
    commentHeader: { display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap' },
    commentAuthorRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    commentAvatar: { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' },
    commentMeta: { color: '#93a1b5', fontSize: '0.85rem', marginTop: '3px' },
    commentActions: { display: 'flex', gap: '10px' },
    textActionButton: { background: 'transparent', color: '#d5dbe6', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 'bold' },
    textActionButtonDanger: { background: 'transparent', color: '#ff8f8f', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 'bold' },
    editBlock: { display: 'flex', flexDirection: 'column', gap: '10px' },
    editActions: { display: 'flex', gap: '10px' },
    commentBody: { margin: 0, color: '#d5dbe6', lineHeight: 1.55 },
    loading: { color: 'white', textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' },
    error: { color: '#e50914', textAlign: 'center', marginTop: '50px' }
};