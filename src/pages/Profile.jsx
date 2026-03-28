import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

export default function Profile() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeProfileTab') || 'profile');
    const [message, setMessage] = useState('');

    const [profileData, setProfileData] = useState({
        username: 'Player',
        role: 'USER',
        displayName: 'Player',
        avatarUrl: '',
        subscriptionActive: false,
        subscriptionEndsAt: null
    });

    const [billingData, setBillingData] = useState({
        subscriptionActive: false,
        cancelAtPeriodEnd: false,
        subscriptionEndsAt: null,
        planName: 'Gamer'
    });
    const [paymentSummary, setPaymentSummary] = useState('Aucun moyen de paiement enregistre');
    const [invoices, setInvoices] = useState([]);

    const [displayNameInput, setDisplayNameInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const billingResult = params.get('billing');
                const sessionId = params.get('session_id');

                if (billingResult === 'success' && sessionId) {
                    const confirmKey = `billing_confirmed_${sessionId}`;
                    const alreadyConfirmed = sessionStorage.getItem(confirmKey) === '1';
                    if (!alreadyConfirmed) {
                        await api.get('/billing/confirm', { params: { sessionId } });
                        sessionStorage.setItem(confirmKey, '1');
                    }
                    setMessage('Subscription activated. Payment confirmed by Stripe.');
                    setTimeout(() => navigate('/games'), 1500);
                    return;
                } else if (billingResult === 'cancel') {
                    setMessage('Stripe checkout canceled. No payment was taken.');
                    window.history.replaceState({}, document.title, '/profile');
                }

                const token = localStorage.getItem('token');
                if (token) {
                    const decoded = jwtDecode(token);
                    setProfileData((prev) => ({
                        ...prev,
                        username: decoded.sub || 'Player',
                        role: decoded.role?.replace('ROLE_', '') || 'USER'
                    }));
                }

                const [statsRes, profileRes, statusRes, paymentRes, invoicesRes] = await Promise.all([
                    api.get('/stats/recent'),
                    api.get('/profile/me'),
                    api.get('/billing/status'),
                    api.get('/billing/payment-method'),
                    api.get('/billing/invoices')
                ]);

                const validStats = statsRes.data.filter((s) => s.gamName && s.gamName !== 'undefined');
                setStats(validStats);

                setProfileData((prev) => ({ ...prev, ...profileRes.data }));
                setDisplayNameInput(profileRes.data.displayName || profileRes.data.username || 'Player');
                setBillingData(statusRes.data);
                setPaymentSummary(paymentRes.data.summary || 'Aucun moyen de paiement enregistre');
                setInvoices(invoicesRes.data || []);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load profile data', err);
                setLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        localStorage.setItem('activeProfileTab', activeTab);
    }, [activeTab]);

    if (loading) return <div style={styles.loadingScreen}><h2>Loading Profile...</h2></div>;

    const totalSecondsPlayed = stats.reduce((sum, stat) => sum + stat.totalPlayTimeSeconds, 0);
    const totalGamesPlayed = stats.length;

    const formatTime = (totalSeconds) => {
        if (!totalSeconds) return '0m';
        if (totalSeconds < 60) return `${totalSeconds}s`;
        const minutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatBillingDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const refreshBillingData = async () => {
        const [statusRes, paymentRes, invoicesRes, profileRes] = await Promise.all([
            api.get('/billing/status'),
            api.get('/billing/payment-method'),
            api.get('/billing/invoices'),
            api.get('/profile/me')
        ]);
        setBillingData(statusRes.data);
        setPaymentSummary(paymentRes.data.summary || 'Aucun moyen de paiement enregistre');
        setInvoices(invoicesRes.data || []);
        setProfileData((prev) => ({ ...prev, ...profileRes.data }));
    };

    const handleUploadAvatar = async () => {
        if (!selectedFile) {
            setMessage('Choose an image first.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const uploadRes = await api.post('/upload/image', formData);
            const profileRes = await api.put('/profile/me', {
                displayName: displayNameInput,
                avatarUrl: uploadRes.data
            });
            setProfileData((prev) => ({ ...prev, ...profileRes.data }));
            setMessage('Avatar updated successfully.');
            setSelectedFile(null);
        } catch (err) {
            console.error(err);
            setMessage('Failed to upload avatar.');
        }
    };

    const handleUpdateProfile = async () => {
        try {
            const profileRes = await api.put('/profile/me', {
                displayName: displayNameInput,
                avatarUrl: profileData.avatarUrl
            });
            setProfileData((prev) => ({ ...prev, ...profileRes.data }));
            setMessage('Profile updated successfully.');
        } catch (err) {
            console.error(err);
            setMessage('Failed to update profile information.');
        }
    };

    const handleChangePassword = async () => {
        try {
            await api.put('/profile/password', {
                currentPassword,
                newPassword
            });
            setCurrentPassword('');
            setNewPassword('');
            setMessage('Password updated successfully.');
        } catch (err) {
            console.error(err);
            setMessage(err?.response?.data?.message || 'Failed to change password.');
        }
    };

    const handleSubscribe = async () => {
        try {
            const sessionRes = await api.post('/billing/checkout-session');
            const checkoutUrl = sessionRes?.data?.checkoutUrl;
            if (!checkoutUrl) {
                throw new Error('Stripe checkout URL was not returned');
            }
            window.location.href = checkoutUrl;
        } catch (err) {
            console.error(err);
            setMessage('Failed to subscribe.');
        }
    };

    const handleCancelSubscription = async () => {
        try {
            await api.post('/billing/cancel');
            await refreshBillingData();
            setMessage('Subscription will remain active until the expiration date, then it will stop.');
        } catch (err) {
            console.error(err);
            setMessage('Failed to cancel subscription.');
        }
    };

    const handleResumeSubscription = async () => {
        try {
            await api.post('/billing/resume');
            await refreshBillingData();
            setMessage('Subscription renewed. Auto-renew has been re-enabled.');
        } catch (err) {
            console.error(err);
            if (err?.response?.status === 403) {
                setMessage('Renew blocked (403). Please re-login and retry. If it persists, ensure frontend is running on localhost and backend was restarted.');
                return;
            }
            const backendMessage = err?.response?.data?.message || err?.response?.data;
            setMessage(backendMessage || 'Failed to renew subscription.');
        }
    };

    const avatarSrc = profileData.avatarUrl || `https://ui-avatars.com/api/?name=${profileData.displayName || profileData.username}&background=e50914&color=fff&size=150&bold=true`;

    return (
        <div style={styles.container}>
            <nav style={styles.navbar}>
                <h1 style={styles.logo} onClick={() => navigate('/games')}>GAMESFLIX</h1>
                <button onClick={() => navigate('/games')} style={styles.backButton}>Back to Library</button>
            </nav>

            <div style={styles.headerBanner}>
                <div style={styles.headerOverlay}>
                    <div style={styles.profileSection}>
                        <img src={avatarSrc} alt="Avatar" style={styles.avatar} />
                        <div>
                            <h1 style={styles.username}>{(profileData.displayName || profileData.username).toUpperCase()}</h1>
                            <span style={styles.roleBadge}>{profileData.role?.replace('ROLE_', '') || 'USER'} Account</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={styles.content}>
                <div style={styles.tabRow}>
                    <button style={{ ...styles.tabButton, ...(activeTab === 'profile' ? styles.tabButtonActive : {}) }} onClick={() => setActiveTab('profile')}>Profile</button>
                    <button style={{ ...styles.tabButton, ...(activeTab === 'billing' ? styles.tabButtonActive : {}) }} onClick={() => setActiveTab('billing')}>Facturation</button>
                </div>

                {message && <p style={styles.message}>{message}</p>}

                {activeTab === 'profile' && (
                    <>
                        <h2 style={styles.sectionTitle}>Profile Settings</h2>
                        <div style={styles.summaryGrid}>
                            <div style={styles.statCard}>
                                <label style={styles.inputLabel}>Display Name</label>
                                <input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} style={styles.input} />
                                <button onClick={handleUpdateProfile} style={styles.actionButton}>Save Profile</button>
                            </div>
                            <div style={styles.statCard}>
                                <label style={styles.inputLabel}>Upload Avatar</label>
                                <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} style={styles.fileInput} />
                                <button onClick={handleUploadAvatar} style={styles.actionButton}>Upload Photo</button>
                            </div>
                            <div style={styles.statCard}>
                                <label style={styles.inputLabel}>Password</label>
                                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={styles.input} placeholder="Current password" />
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={styles.input} placeholder="New password" />
                                <button onClick={handleChangePassword} style={styles.actionButton}>Change Password</button>
                            </div>
                        </div>

                        <h2 style={{ ...styles.sectionTitle, marginTop: '50px' }}>Lifetime Stats</h2>
                        <div style={styles.summaryGrid}>
                            <div style={styles.statCard}>
                                <div style={styles.statValue}>{formatTime(totalSecondsPlayed)}</div>
                                <div style={styles.statLabel}>Total Playtime</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statValue}>{totalGamesPlayed}</div>
                                <div style={styles.statLabel}>Games Played</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statValue}>{stats.length > 0 ? stats[0].gamName : 'None'}</div>
                                <div style={styles.statLabel}>Most Recent Game</div>
                            </div>
                        </div>

                        <h2 style={{ ...styles.sectionTitle, marginTop: '50px' }}>Play History</h2>
                        {stats.length === 0 ? (
                            <p style={{ color: '#aaa' }}>You have not played any games yet.</p>
                        ) : (
                            <div style={styles.historyList}>
                                {stats.map((stat) => (
                                    <div key={stat.id} style={styles.historyItem}>
                                        <div style={styles.historyInfo}>
                                            <h3 style={styles.historyTitle}>{stat.gamName}</h3>
                                            <p style={styles.historyDate}>Last played: {formatDate(stat.lastPlayed)}</p>
                                        </div>
                                        <div style={styles.historyTime}>{formatTime(stat.totalPlayTimeSeconds)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'billing' && (
                    <>
                        <h2 style={styles.sectionTitle}>Facturation</h2>
                        <div style={styles.summaryGrid}>
                            <div style={styles.statCard}>
                                <div style={styles.statValue}>{billingData.subscriptionActive ? 'Active' : 'Inactive'}</div>
                                <div style={styles.statLabel}>Subscription</div>
                                <p style={styles.smallLine}>Plan: {billingData.planName || 'Gamer'}</p>
                                <p style={styles.smallLine}>Expires: {formatBillingDate(billingData.subscriptionEndsAt)}</p>
                                {billingData.subscriptionActive && billingData.cancelAtPeriodEnd && (
                                    <p style={styles.warningLine}>Cancellation scheduled. Access remains active until expiry.</p>
                                )}
                                {!billingData.subscriptionActive ? (
                                    <button onClick={handleSubscribe} style={styles.actionButton}>Subscribe</button>
                                ) : !billingData.cancelAtPeriodEnd ? (
                                    <button onClick={handleCancelSubscription} style={styles.cancelActionButton}>Cancel Subscription</button>
                                ) : (
                                    <button onClick={handleResumeSubscription} style={styles.actionButton}>Renew Subscription</button>
                                )}
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statValueSmall}>Moyen de Paiement</div>
                                <div style={styles.paymentSummary}>{paymentSummary}</div>
                                <p style={styles.smallLine}>Stripe sandbox source</p>
                            </div>
                        </div>

                        <h2 style={{ ...styles.sectionTitle, marginTop: '50px' }}>Invoice History</h2>
                        {invoices.length === 0 ? (
                            <p style={{ color: '#aaa' }}>No invoices yet.</p>
                        ) : (
                            <div style={styles.historyList}>
                                {invoices.map((invoice) => (
                                    <div key={invoice.id} style={styles.historyItem}>
                                        <div style={styles.historyInfo}>
                                            <h3 style={styles.historyTitle}>{invoice.description}</h3>
                                            <p style={styles.historyDate}>{formatDate(invoice.createdAt)}</p>
                                        </div>
                                        <div style={styles.invoiceAmount}>{invoice.amount} {invoice.currency}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#141414', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", paddingBottom: '50px' },
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 50px', backgroundColor: '#0f0f0f', borderBottom: '1px solid #333' },
    logo: { margin: 0, color: '#e50914', fontSize: '32px', fontFamily: '"Arial Black", Impact, sans-serif', fontWeight: '900', letterSpacing: '-1px', transform: 'scaleY(1.2)', cursor: 'pointer', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
    backButton: { padding: '8px 16px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },

    headerBanner: { height: '300px', backgroundImage: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' },
    headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, #141414 0%, rgba(20,20,20,0.4) 100%)', display: 'flex', alignItems: 'flex-end', padding: '0 50px 30px 50px' },
    profileSection: { display: 'flex', alignItems: 'center', gap: '30px' },
    avatar: { width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #141414', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', objectFit: 'cover' },
    username: { fontSize: '3.5rem', margin: '0 0 10px 0', textShadow: '2px 2px 5px rgba(0,0,0,0.8)' },
    roleBadge: { backgroundColor: '#e50914', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' },

    content: { padding: '40px 50px', maxWidth: '1200px', margin: '0 auto' },
    tabRow: { display: 'flex', gap: '12px', marginBottom: '20px' },
    tabButton: { padding: '10px 18px', borderRadius: '999px', border: '1px solid #555', backgroundColor: '#222', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    tabButtonActive: { backgroundColor: '#e50914', borderColor: '#e50914' },
    message: { color: '#8bc34a', backgroundColor: 'rgba(139,195,74,0.12)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(139,195,74,0.35)' },

    sectionTitle: { fontSize: '1.8rem', marginBottom: '25px', borderBottom: '2px solid #333', paddingBottom: '10px', color: '#e5e5e5' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    statCard: { backgroundColor: '#1c1c1c', padding: '20px', borderRadius: '8px', border: '1px solid #333', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
    statValue: { fontSize: '2.2rem', fontWeight: 'bold', color: '#4caf50', marginBottom: '10px' },
    statValueSmall: { fontSize: '1.2rem', fontWeight: 'bold', color: '#f3f3f3', marginBottom: '10px' },
    statLabel: { color: '#aaa', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' },
    smallLine: { color: '#a8a8a8', fontSize: '0.9rem', margin: '8px 0 0 0' },
    warningLine: { color: '#ffcc80', fontSize: '0.85rem', margin: '10px 0 0 0' },

    inputLabel: { display: 'block', fontSize: '0.9rem', color: '#b9b9b9', marginBottom: '8px' },
    input: { width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #464646', backgroundColor: '#2a2a2a', color: 'white', marginBottom: '10px' },
    fileInput: { width: '100%', marginBottom: '10px', color: '#d2d2d2' },
    actionButton: { padding: '10px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
    cancelActionButton: { padding: '10px 14px', borderRadius: '6px', border: '1px solid #777', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
    disabledButton: { padding: '10px 14px', borderRadius: '6px', border: '1px solid #555', backgroundColor: '#2a2a2a', color: '#888', fontWeight: 'bold', cursor: 'not-allowed' },

    paymentSummary: { backgroundColor: '#0f1922', border: '1px solid #28435f', borderRadius: '8px', padding: '12px', lineHeight: 1.45, color: '#d8e6f5' },

    historyList: { display: 'flex', flexDirection: 'column', gap: '15px' },
    historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1c1c1c', padding: '20px 30px', borderRadius: '8px', border: '1px solid #333' },
    historyInfo: { display: 'flex', flexDirection: 'column', gap: '5px' },
    historyTitle: { margin: 0, fontSize: '1.1rem', color: '#fff' },
    historyDate: { margin: 0, color: '#aaa', fontSize: '0.9rem' },
    historyTime: { fontSize: '1.3rem', fontWeight: 'bold', color: '#4caf50' },
    invoiceAmount: { fontSize: '1.1rem', fontWeight: 'bold', color: '#e5e5e5' },

    loadingScreen: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#141414', color: '#e50914' }
};
