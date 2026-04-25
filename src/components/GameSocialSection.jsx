import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

export default function GameSocialSection({ gameAssetPath, gameTitleCandidates = [] }) {
    const [gameId, setGameId] = useState(null);
    const [summary, setSummary] = useState({ averageRating: null, ratingCount: 0, userRating: null, favorite: false });
    const [comments, setComments] = useState([]);
    const [commentDraft, setCommentDraft] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentContent, setEditingCommentContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const normalizedTitles = useMemo(
        () => gameTitleCandidates.map((title) => title.trim().toLowerCase()),
        [gameTitleCandidates]
    );

    useEffect(() => {
        const resolveGameId = async () => {
            try {
                const response = await api.get('/games');
                const allGames = response.data || [];

                let game = allGames.find((entry) => entry.assetPath === gameAssetPath);
                if (!game) {
                    game = allGames.find((entry) => normalizedTitles.includes((entry.title || '').trim().toLowerCase()));
                }

                if (!game?.id) {
                    setError('Social features are unavailable for this game right now.');
                    setLoading(false);
                    return;
                }

                setGameId(game.id);
            } catch {
                setError('Failed to load social features.');
                setLoading(false);
            }
        };

        resolveGameId();
    }, [gameAssetPath, normalizedTitles]);

    useEffect(() => {
        if (!gameId) return;

        const loadSocial = async () => {
            try {
                const [summaryResponse, commentsResponse] = await Promise.all([
                    api.get(`/social/games/${gameId}/summary`),
                    api.get(`/social/games/${gameId}/comments`)
                ]);

                setSummary(summaryResponse.data || { averageRating: null, ratingCount: 0, userRating: null, favorite: false });
                setComments(commentsResponse.data || []);
            } catch {
                setError('Failed to load ratings and comments.');
            } finally {
                setLoading(false);
            }
        };

        loadSocial();
    }, [gameId]);

    const refreshSocial = async () => {
        if (!gameId) return;

        const [summaryResponse, commentsResponse] = await Promise.all([
            api.get(`/social/games/${gameId}/summary`),
            api.get(`/social/games/${gameId}/comments`)
        ]);

        setSummary(summaryResponse.data || { averageRating: null, ratingCount: 0, userRating: null, favorite: false });
        setComments(commentsResponse.data || []);
    };

    const handleFavoriteToggle = async () => {
        if (!gameId) return;
        try {
            if (summary.favorite) {
                await api.delete(`/social/games/${gameId}/favorite`);
            } else {
                await api.post(`/social/games/${gameId}/favorite`);
            }
            await refreshSocial();
            setError('');
        } catch {
            setError('Could not update favorites.');
        }
    };

    const handleRating = async (rating) => {
        if (!gameId) return;
        try {
            const response = await api.post(`/social/games/${gameId}/rating`, { rating });
            setSummary(response.data);
            setError('');
        } catch {
            setError('Could not save your rating.');
        }
    };

    const handleAddComment = async (event) => {
        event.preventDefault();
        if (!gameId) return;

        if (!commentDraft.trim()) {
            setError('Write a comment first.');
            return;
        }

        try {
            await api.post(`/social/games/${gameId}/comments`, { content: commentDraft });
            setCommentDraft('');
            setError('');
            await refreshSocial();
        } catch {
            setError('Could not post your comment.');
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
            setError('Comment cannot be empty.');
            return;
        }

        try {
            await api.put(`/social/comments/${commentId}`, { content: editingCommentContent });
            cancelEditingComment();
            setError('');
            await refreshSocial();
        } catch {
            setError('Could not update the comment.');
        }
    };

    const deleteComment = async (commentId) => {
        try {
            await api.delete(`/social/comments/${commentId}`);
            setError('');
            await refreshSocial();
        } catch {
            setError('Could not delete the comment.');
        }
    };

    if (loading) {
        return (
            <section style={styles.panel}>
                <h2 style={styles.panelTitle}>Ratings & Comments</h2>
                <p style={styles.panelText}>Loading...</p>
            </section>
        );
    }

    return (
        <section style={styles.panel}>
            <h2 style={styles.panelTitle}>Ratings & Comments</h2>
            <div style={styles.summaryLine}>
                <span style={styles.summaryPill}>{summary.ratingCount || 0} rating{(summary.ratingCount || 0) === 1 ? '' : 's'}</span>
                <span style={styles.summaryPill}>{(summary.averageRating || 0).toFixed(1)} avg</span>
                <button style={summary.favorite ? styles.favoriteButtonActive : styles.favoriteButton} onClick={handleFavoriteToggle}>
                    {summary.favorite ? '♥ Favorited' : '♡ Favorite'}
                </button>
            </div>

            <div style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" style={styles.starButton} onClick={() => handleRating(star)} title={`Rate ${star} star${star > 1 ? 's' : ''}`}>
                        <span style={{ color: star <= (summary.userRating || 0) ? '#f5c518' : '#444' }}>★</span>
                    </button>
                ))}
            </div>

            <form onSubmit={handleAddComment} style={styles.commentForm}>
                <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Leave a comment..." style={styles.textarea} />
                <button type="submit" style={styles.primaryButton}>Post comment</button>
            </form>

            {error && <p style={styles.errorText}>{error}</p>}

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
    );
}

const styles = {
    panel: { backgroundColor: 'rgba(8, 12, 19, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '20px', marginTop: '20px', width: '100%', boxSizing: 'border-box' },
    panelTitle: { marginTop: 0, marginBottom: '8px', color: '#fff' },
    panelText: { marginTop: 0, color: '#aab4c3' },
    summaryLine: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' },
    summaryPill: { padding: '6px 10px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#d9e0ea', fontSize: '0.9rem' },
    favoriteButton: { padding: '8px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.06)', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    favoriteButtonActive: { padding: '8px 14px', borderRadius: '999px', border: '1px solid rgba(229, 9, 20, 0.45)', backgroundColor: 'rgba(229, 9, 20, 0.18)', color: '#ffb2b7', cursor: 'pointer', fontWeight: 'bold' },
    starRow: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' },
    starButton: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.8rem', padding: 0, lineHeight: 1 },
    commentForm: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' },
    textarea: { minHeight: '90px', resize: 'vertical', width: '100%', boxSizing: 'border-box', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.14)', backgroundColor: '#101826', color: 'white', padding: '12px', fontFamily: 'inherit' },
    primaryButton: { padding: '10px 14px', borderRadius: '12px', border: 'none', backgroundColor: '#e50914', color: 'white', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-start' },
    secondaryButton: { padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.18)', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    errorText: { color: '#ff9f9f', marginTop: 0 },
    commentList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    commentCard: { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px' },
    commentHeader: { display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap' },
    commentAuthorRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    commentAvatar: { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' },
    commentMeta: { color: '#93a1b5', fontSize: '0.85rem', marginTop: '3px' },
    commentActions: { display: 'flex', gap: '10px' },
    textActionButton: { background: 'transparent', color: '#d5dbe6', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 'bold' },
    textActionButtonDanger: { background: 'transparent', color: '#ff8f8f', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 'bold' },
    editBlock: { display: 'flex', flexDirection: 'column', gap: '10px' },
    editActions: { display: 'flex', gap: '10px' },
    commentBody: { margin: 0, color: '#d5dbe6', lineHeight: 1.45 }
};