import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

export default function Profile() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState({ username: 'Player', role: 'USER' });
    const navigate = useNavigate();

    useEffect(() => {
        // 1. Grab the username from the JWT token
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserInfo({
                    username: decoded.sub || 'Player', // Spring Boot usually puts the username in 'sub'
                    role: decoded.role?.replace('ROLE_', '') || 'USER'
                });
            } catch (err) {
                console.error("Could not decode token");
            }
        }

        // 2. Fetch all their played games from your existing endpoint
        api.get('/stats/recent')
            .then(res => {
                // Filter out any buggy data just like we did on the dashboard
                const validStats = res.data.filter(s => s.gamName && s.gamName !== 'undefined');
                setStats(validStats);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load profile stats", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div style={styles.loadingScreen}><h2>Loading Profile...</h2></div>;

    // --- MATH HELPERS ---
    const totalSecondsPlayed = stats.reduce((sum, stat) => sum + stat.totalPlayTimeSeconds, 0);
    const totalGamesPlayed = stats.length;

    const formatTime = (totalSeconds) => {
        if (!totalSeconds) return "0m";
        if (totalSeconds < 60) return `${totalSeconds}s`;
        const minutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div style={styles.container}>
            {/* NAVBAR */}
            <nav style={styles.navbar}>
                <h1 style={styles.logo} onClick={() => navigate('/games')}>GAMESFLIX</h1>
                <button onClick={() => navigate('/games')} style={styles.backButton}>← Back to Library</button>
            </nav>

            {/* HEADER BANNER */}
            <div style={styles.headerBanner}>
                <div style={styles.headerOverlay}>
                    <div style={styles.profileSection}>
                        {/* Auto-generates an avatar based on their username! */}
                        <img
                            src={`https://ui-avatars.com/api/?name=${userInfo.username}&background=e50914&color=fff&size=150&bold=true`}
                            alt="Avatar"
                            style={styles.avatar}
                        />
                        <div>
                            <h1 style={styles.username}>{userInfo.username.toUpperCase()}</h1>
                            <span style={styles.roleBadge}>{userInfo.role} Account</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={styles.content}>
                {/* LIFETIME STATS SUMMARY */}
                <h2 style={styles.sectionTitle}>Lifetime Stats</h2>
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

                {/* DETAILED PLAY HISTORY */}
                <h2 style={{...styles.sectionTitle, marginTop: '50px'}}>Play History</h2>
                {stats.length === 0 ? (
                    <p style={{ color: '#aaa' }}>You haven't played any games yet. Head to the library to start gaming!</p>
                ) : (
                    <div style={styles.historyList}>
                        {stats.map((stat) => (
                            <div key={stat.id} style={styles.historyItem}>
                                <div style={styles.historyInfo}>
                                    <h3 style={styles.historyTitle}>{stat.gamName}</h3>
                                    <p style={styles.historyDate}>Last played: {formatDate(stat.lastPlayed)}</p>
                                </div>
                                <div style={styles.historyTime}>
                                    {formatTime(stat.totalPlayTimeSeconds)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#141414', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", paddingBottom: '50px' },
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 50px', backgroundColor: '#0f0f0f', borderBottom: '1px solid #333' },
    logo: { margin: 0, color: '#e50914', fontSize: '32px', fontFamily: '"Arial Black", Impact, sans-serif', fontWeight: '900', letterSpacing: '-1px', transform: 'scaleY(1.2)', cursor: 'pointer', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
    backButton: { padding: '8px 16px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' },

    headerBanner: { height: '300px', backgroundImage: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' },
    headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, #141414 0%, rgba(20,20,20,0.4) 100%)', display: 'flex', alignItems: 'flex-end', padding: '0 50px 30px 50px' },
    profileSection: { display: 'flex', alignItems: 'center', gap: '30px' },
    avatar: { width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #141414', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' },
    username: { fontSize: '3.5rem', margin: '0 0 10px 0', textShadow: '2px 2px 5px rgba(0,0,0,0.8)' },
    roleBadge: { backgroundColor: '#e50914', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' },

    content: { padding: '40px 50px', maxWidth: '1200px', margin: '0 auto' },
    sectionTitle: { fontSize: '1.8rem', marginBottom: '25px', borderBottom: '2px solid #333', paddingBottom: '10px', color: '#e5e5e5' },

    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    statCard: { backgroundColor: '#1c1c1c', padding: '30px', borderRadius: '8px', border: '1px solid #333', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
    statValue: { fontSize: '2.5rem', fontWeight: 'bold', color: '#4caf50', marginBottom: '10px' },
    statLabel: { color: '#aaa', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' },

    historyList: { display: 'flex', flexDirection: 'column', gap: '15px' },
    historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1c1c1c', padding: '20px 30px', borderRadius: '8px', border: '1px solid #333', transition: 'transform 0.2s, backgroundColor 0.2s' },
    historyInfo: { display: 'flex', flexDirection: 'column', gap: '5px' },
    historyTitle: { margin: 0, fontSize: '1.3rem', color: '#fff' },
    historyDate: { margin: 0, color: '#aaa', fontSize: '0.9rem' },
    historyTime: { fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' },

    loadingScreen: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#141414', color: '#e50914' }
};