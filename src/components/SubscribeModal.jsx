import { useState } from 'react';

export default function SubscribeModal({
    isOpen,
    onClose,
    onSubscribe,
    gameTitle,
    isConsoleMode = false,
    selectedAction = 'subscribe',
    onActionChange
}) {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubscribe = async () => {
        try {
            setLoading(true);
            await onSubscribe();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Subscription Required</h2>
                <p style={styles.text}>
                    {gameTitle ? `${gameTitle} is a paid coded game.` : 'This game is paid.'} Subscribe to unlock all coded games.
                </p>
                <div style={styles.planBox}>
                    <div style={styles.planName}>Monthly Plan</div>
                    <div style={styles.planPrice}>$2.99 / month</div>
                    <p style={styles.planNote}>Powered by Stripe Sandbox</p>
                    {isConsoleMode && (
                        <p style={styles.planNoteSmall}>Keyboard controls: Left/Right to choose, Enter to confirm, Esc to close.</p>
                    )}
                </div>
                <div style={styles.buttonRow}>
                    <button
                        style={{
                            ...styles.cancelButton,
                            ...(isConsoleMode && selectedAction === 'cancel' ? styles.consoleSelectedButton : {})
                        }}
                        onClick={onClose}
                        onMouseEnter={() => onActionChange && onActionChange('cancel')}
                        disabled={loading}
                    >
                        Not now
                    </button>
                    <button
                        style={{
                            ...styles.subscribeButton,
                            opacity: loading ? 0.7 : 1,
                            ...(isConsoleMode && selectedAction === 'subscribe' ? styles.consoleSelectedButton : {})
                        }}
                        onClick={handleSubscribe}
                        onMouseEnter={() => onActionChange && onActionChange('subscribe')}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : 'Subscribe'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
    modal: { width: 'min(520px, 92vw)', backgroundColor: '#171717', border: '1px solid #3a3a3a', borderRadius: '12px', padding: '26px', color: 'white', boxShadow: '0 18px 45px rgba(0,0,0,0.45)' },
    title: { margin: '0 0 10px 0', fontSize: '1.6rem' },
    text: { margin: '0 0 16px 0', color: '#c9c9c9', lineHeight: 1.5 },
    planBox: { backgroundColor: '#101820', border: '1px solid #28435f', borderRadius: '10px', padding: '16px', marginBottom: '18px' },
    planName: { fontWeight: 700, fontSize: '1.1rem' },
    planPrice: { marginTop: '6px', color: '#4caf50', fontWeight: 800, fontSize: '1.25rem' },
    planNote: { margin: '8px 0 0 0', color: '#d6e2ee', fontSize: '0.9rem' },
    planNoteSmall: { margin: '8px 0 0 0', color: '#9fb2c7', fontSize: '0.8rem' },
    buttonRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    cancelButton: { border: '1px solid #555', backgroundColor: 'transparent', color: 'white', borderRadius: '6px', padding: '9px 14px', cursor: 'pointer' },
    subscribeButton: { border: 'none', backgroundColor: '#e50914', color: 'white', borderRadius: '6px', padding: '9px 14px', cursor: 'pointer', fontWeight: 700 },
    consoleSelectedButton: { boxShadow: '0 0 0 2px #ffffff inset, 0 0 0 2px #ffffff' }
};
