import { useState, useEffect, useCallback,useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import AddGameModal from '../components/AddGameModal';
import EditGameModal from '../components/EditGameModal';
import SubscribeModal from '../components/SubscribeModal';

export default function Games() {
    const [editingGame, setEditingGame] = useState(null);
    const [recentStats, setRecentStats] = useState([]);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // UI Toggles
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [userRole, setUserRole] = useState('ROLE_USER');
    const [username, setUsername] = useState('Player');
    const [isConsoleMode, setIsConsoleMode] = useState(() => localStorage.getItem('gamesflix_mode') === 'true');

    // UI Focus States
    const [activeIndex, setActiveIndex] = useState(0); // For Console Mode
    const [featuredIndex, setFeaturedIndex] = useState(0); // For Desktop Billboard
    const [searchQuery, setSearchQuery] = useState('');
    const [billingStatus, setBillingStatus] = useState({ subscriptionActive: false });
    const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
    const [selectedPaidGame, setSelectedPaidGame] = useState(null);

    const navigate = useNavigate();
    const rowRef = useRef(null);

    const handleScroll = (direction) => {
        if (rowRef.current) {
            const { current } = rowRef;
            // Scrolls about one and a half cards at a time (400px)
            const scrollAmount = direction === 'left' ? -400 : 400;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // 1. Load User Role
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.role) setUserRole(decoded.role);
                if (decoded.sub) setUsername(decoded.sub);
            } catch (err) {
                console.error("Could not decode token");
            }
        }
        fetchGames();
    }, []);

    // 2. Save Console Mode Preference
    useEffect(() => {
        localStorage.setItem('gamesflix_mode', isConsoleMode);
    }, [isConsoleMode]);

    // 3. Auto-Rotate Desktop Billboard (Changes every 6 seconds)
    useEffect(() => {
        if (isConsoleMode || games.length === 0) return;
        const interval = setInterval(() => {
            setFeaturedIndex(prev => (prev + 1) % Math.min(games.length, 5));
        }, 6000);
        return () => clearInterval(interval);
    }, [isConsoleMode, games.length]);

    const fetchGames = async () => {
        try {
            const [gamesResponse, statsResponse, billingResponse] = await Promise.all([
                api.get('/games'),
                api.get('/stats/recent'),
                api.get('/billing/status')
            ]);
            setGames(gamesResponse.data);
            setRecentStats(statsResponse.data);
            setBillingStatus(billingResponse.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to load dashboard data.');
            setLoading(false);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) handleLogout();
        }
    };

    const handleDeleteGame = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this game? This cannot be undone.")) {
            try {
                await api.delete(`/games/${id}`);
                fetchGames();
            } catch (err) {
                console.error(err);
                alert("Failed to delete the game. You might not have permission.");
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const goToGame = (game) => {
        navigate(game.gameType === 'CODED' ? game.assetPath : `/play/${game.id}`);
    };

    const handleGameStart = (game) => {
        const isCodedGame = game.gameType === 'CODED';
        if (isCodedGame && !billingStatus.subscriptionActive) {
            setSelectedPaidGame(game);
            setIsSubscribeModalOpen(true);
            return;
        }
        goToGame(game);
    };

    const handlePlayActive = useCallback(() => {
        if (games.length === 0) return;
        const game = games[activeIndex];
        handleGameStart(game);
    }, [games, activeIndex, billingStatus.subscriptionActive]);

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
            setError('Failed to start Stripe checkout. Please try again.');
            setIsSubscribeModalOpen(false);
        }
    };

    // --- CONSOLE MODE CONTROLS ---
    useEffect(() => {
        if (!isConsoleMode || games.length === 0) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') setActiveIndex(prev => Math.max(0, prev - 1));
            if (e.key === 'ArrowRight') setActiveIndex(prev => Math.min(games.length - 1, prev + 1));
            if (e.key === 'Enter') handlePlayActive();
            if (e.key === 'Escape') setIsConsoleMode(false);
        };
        window.addEventListener('keydown', handleKeyDown);

        let animationFrameId;
        let lastActionTime = 0;
        const pollGamepads = () => {
            const gamepads = navigator.getGamepads();
            if (gamepads[0]) {
                const gp = gamepads[0];
                const now = Date.now();
                if (now - lastActionTime > 200) {
                    if (gp.buttons[14].pressed || gp.axes[0] < -0.5) { setActiveIndex(prev => Math.max(0, prev - 1)); lastActionTime = now; }
                    else if (gp.buttons[15].pressed || gp.axes[0] > 0.5) { setActiveIndex(prev => Math.min(games.length - 1, prev + 1)); lastActionTime = now; }
                    else if (gp.buttons[0].pressed) { handlePlayActive(); lastActionTime = now; }
                    else if (gp.buttons[1].pressed) { setIsConsoleMode(false); lastActionTime = now; }
                }
            }
            animationFrameId = requestAnimationFrame(pollGamepads);
        };
        pollGamepads();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isConsoleMode, games.length, activeIndex, handlePlayActive]);

    if (loading) return <div style={styles.loadingScreen}><h2>Loading Gamesflix...</h2></div>;

    const formatTime = (totalSeconds) => {
        if (!totalSeconds) return "0m";
        if (totalSeconds < 60) return `${totalSeconds}s`;
        const minutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    const activeGame = games[activeIndex];
    const activeStat = activeGame ? recentStats.find(s => s.gamName === activeGame.title) : null;
    const activeBg = activeGame?.thumbnailUrl || 'https://placehold.co/1920x1080/141414/222222/png';

    // The games to show in the Billboard (up to top 5)
    const featuredGames = games.slice(0, 5);
    const currentFeatured = featuredGames[featuredIndex];
    // Filter games based on the search query
    const filteredGames = games.filter(game =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const containerStyle = {
        ...styles.container,
        backgroundColor: isConsoleMode ? '#0a101e' : '#141414',
    };

    return (
        <div style={containerStyle}>
            {isConsoleMode && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
                    backgroundImage: `url('${activeBg}')`, backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'blur(20px) brightness(0.3)', transition: 'background-image 0.5s ease'
                }} />
            )}

            {/* NAVBAR */}
            <nav style={styles.navbar}>
                <h1 style={styles.logo}>GAMESFLIX</h1>
                <div style={styles.navControls}>
                    {/* NEW: PREMIUM SEARCH BAR */}
                    {!isConsoleMode && (
                        <div className="netflix-search-container">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Titles, genres..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="netflix-search-input"
                            />
                            {/* The magical 'X' to instantly clear the search */}
                            <span
                                className={`clear-icon ${searchQuery ? 'visible' : ''}`}
                                onClick={() => setSearchQuery('')}
                            >
                                ✕
                            </span>
                        </div>
                    )}

                    {userRole !== 'ROLE_ADMIN' && (
                        <button style={styles.consoleToggleButton} onClick={() => setIsConsoleMode(!isConsoleMode)}>
                            {isConsoleMode ? '🖥️ Desktop Mode' : '🎮 Console Mode'}
                        </button>
                    )}

                    {userRole === 'ROLE_ADMIN' && !isConsoleMode && (
                        <button style={styles.addButton} onClick={() => setIsAddModalOpen(true)}>+ Add Game</button>
                    )}

                    {!isConsoleMode && (
                        <img
                            src={`https://ui-avatars.com/api/?name=${username}&background=e50914&color=fff&size=40&bold=true`}
                            alt="Profile"
                            className="netflix-avatar"
                            onClick={() => navigate('/profile')}
                            title="View Profile"
                        />
                    )}

                    {!isConsoleMode && <button onClick={handleLogout} style={styles.logoutButton}>Sign Out</button>}
                </div>
            </nav>

            {error && <p style={styles.error}>{error}</p>}

            <div style={{ transition: 'opacity 0.5s ease', opacity: loading ? 0 : 1, position: 'relative', zIndex: 1 }}>

                {isConsoleMode ? (
                    /* --- CONSOLE MODE --- */
                    <div style={styles.steamContainer}>
                        <div style={styles.carouselWrapper}>
                            <div style={{...styles.carouselTrack, transform: `translateX(calc(50vw - 120px - ${activeIndex * 260}px))`}}>
                                {games.map((game, i) => {
                                    const isActive = i === activeIndex;
                                    return (
                                        <div key={game.id} style={isActive ? styles.steamCardActive : styles.steamCard} onClick={() => setActiveIndex(i)} onDoubleClick={() => isActive && handlePlayActive()}>
                                            <img src={game.thumbnailUrl || 'https://placehold.co/400x600/222/fff&text=No+Cover'} style={styles.steamImage} alt={game.title} />
                                            {isActive && <div style={styles.activeIcon}>🎮</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {activeGame && (
                            <div style={styles.focusedGameInfo}>
                                <h1 style={{ fontSize: '3.5rem', margin: '0 0 10px 0', textShadow: '2px 2px 5px rgba(0,0,0,0.8)' }}>{activeGame.title}</h1>
                                <p style={{ fontSize: '1.2rem', color: '#4caf50', margin: 0, fontWeight: 'bold', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>▶ PLAYTIME: {activeStat ? formatTime(activeStat.totalPlayTimeSeconds) : "0m"}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* --- DESKTOP MODE --- */
                    <>
                        {/* 1. CINEMATIC HERO SECTION */}
                        <div style={styles.hero}>
                            <div style={styles.heroGradient}></div>
                            <div style={styles.heroContent}>
                                <h1 style={styles.heroTitle}>Unlimited Gaming.</h1>
                                <p style={styles.heroSubtitle}>Play anywhere. Cancel anytime.</p>
                            </div>
                        </div>

                        {/* 2. STEAM-STYLE BILLBOARD (Pulled up over the fade!) */}
                        {/* ONLY SHOW IF NOT SEARCHING */}
                        {searchQuery === '' && featuredGames.length > 0 && (
                            <div style={styles.billboardSection}>
                                <h2 style={styles.billboardHeading}>Featured & Recommended</h2>

                                <div style={styles.billboardContainer}>
                                    <button style={styles.arrowBtn} onClick={() => setFeaturedIndex(prev => prev === 0 ? featuredGames.length - 1 : prev - 1)}>❮</button>

                                    <div className="billboard-card" onClick={() => handleGameStart(currentFeatured)}>
                                        <div style={styles.billboardLeft}>
                                            <div style={{...styles.billboardBlurBg, backgroundImage: `url(${currentFeatured.thumbnailUrl || 'https://placehold.co/800x400/222/fff'})`}} />
                                            <img src={currentFeatured.thumbnailUrl || 'https://placehold.co/800x400/222/fff'} alt={currentFeatured.title} style={styles.billboardImg} />
                                        </div>

                                        {/* Right Side: Info Panel */}
                                        <div style={styles.billboardRight}>
                                            <h2 style={styles.billboardTitle}>{currentFeatured.title}</h2>

                                            <p style={{...styles.billboardDesc, marginTop: '20px'}}>
                                                {currentFeatured.description || "Jump into this incredible experience. Included with your Gamesflix subscription."}
                                            </p>

                                            <div style={styles.billboardTags}>
                                                <span className="hover-badge">{currentFeatured.gameType}</span>
                                                <span className="hover-badge">Featured</span>
                                                {currentFeatured.gameType === 'CODED' && <span className="hover-badge">Paid</span>}
                                            </div>

                                            <div style={styles.billboardAction}>
                                                <div style={{ fontSize: '0.8rem', color: '#acb2b8' }}>Available Now</div>
                                                <button style={styles.playNowBtn}>Play Now</button>
                                            </div>
                                        </div>
                                    </div>

                                    <button style={styles.arrowBtn} onClick={() => setFeaturedIndex(prev => prev === featuredGames.length - 1 ? 0 : prev + 1)}>❯</button>
                                </div>

                                <div style={styles.dotsContainer}>
                                    {featuredGames.map((_, idx) => (
                                        <div key={idx} style={{...styles.dot, backgroundColor: idx === featuredIndex ? '#fff' : '#3d4450'}} onClick={() => setFeaturedIndex(idx)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. REGULAR CATALOG */}
                        <div style={styles.catalogSection}>

                            {/* ONLY SHOW CONTINUE PLAYING IF NOT SEARCHING */}
                            {searchQuery === '' && recentStats.filter(s => s.gamName && s.gamName !== 'undefined').length > 0 && (
                                <div style={{ marginBottom: '40px', position: 'relative' }}>
                                    <h3 style={styles.sectionTitle}>Continue Playing</h3>

                                    {/* NEW: WRAPPER FOR THE ARROWS */}
                                    <div style={styles.rowWrapper}>

                                        {/* LEFT ARROW */}
                                        <button
                                            className="row-arrow"
                                            style={{...styles.rowArrow, left: '-20px', background: 'linear-gradient(to right, rgba(20,20,20,1) 0%, rgba(20,20,20,0) 100%)'}}
                                            onClick={() => handleScroll('left')}
                                        >
                                            ❮
                                        </button>

                                        {/* SCROLLABLE CONTAINER (Added ref={rowRef}) */}
                                        <div ref={rowRef} className="hide-scroll" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
                                            {recentStats.filter(s => s.gamName && s.gamName !== 'undefined').map(stat => {
                                                const matchingGame = games.find(g => g.title === stat.gamName);
                                                const imageSrc = matchingGame?.thumbnailUrl || 'https://placehold.co/300x150/222/fff?text=' + stat.gamName;
                                                return (
                                                    <div key={stat.id} style={styles.recentCard} onClick={() => matchingGame && handleGameStart(matchingGame)}>
                                                        <img src={imageSrc} style={styles.recentImage} alt={stat.gamName} />
                                                        <div style={styles.recentInfo}>
                                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{stat.gamName}</h4>
                                                            <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>⏱️ Total Time: <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{formatTime(stat.totalPlayTimeSeconds)}</span></p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>


                                        <button
                                            className="row-arrow"
                                            style={{...styles.rowArrow, right: '-20px', background: 'linear-gradient(to left, rgba(20,20,20,1) 0%, rgba(20,20,20,0) 100%)'}}
                                            onClick={() => handleScroll('right')}
                                        >
                                            ❯
                                        </button>

                                    </div>
                                </div>
                            )}

                            <div>
                                {/* CHANGE TITLE BASED ON SEARCH */}
                                <h3 style={styles.sectionTitle}>
                                    {searchQuery ? `Search Results for "${searchQuery}"` : 'All Games'}
                                </h3>

                                <div style={styles.grid}>
                                    {/* USE filteredGames INSTEAD OF games */}
                                    {filteredGames.length === 0 ? <p style={styles.noGames}>No games found.</p> : null}

                                    {filteredGames.map((game) => {

                                        return (
                                            <div key={game.id} className="game-card" onClick={() => handleGameStart(game)}>
                                                {userRole === 'ROLE_ADMIN' && (
                                                    <>
                                                        <button
                                                            className="edit-btn"
                                                            style={styles.editButton}
                                                            onClick={(e) => { e.stopPropagation(); setEditingGame(game); }}
                                                            title="Edit Game"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="delete-btn"
                                                            style={styles.deleteButton}
                                                            onClick={(e) => handleDeleteGame(e, game.id)}
                                                            title="Delete Game"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                                <div className="game-poster-wrapper">
                                                    <img src={game.thumbnailUrl || 'https://placehold.co/400x600/222222/FFFFFF/png?text=No+Cover'} alt={game.title} className="game-poster" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x600/141414/e50914/png?text=Image+Error'; }} />
                                                    <div className="game-hover-overlay">
                                                        <p className="hover-desc">{game.description ? game.description : "No description available."}</p>
                                                        <div className="hover-tags"><span className="hover-badge">{game.gameType}</span></div>

                                                        <div className="hover-play-btn">▶ {game.gameType === 'CODED' && !billingStatus.subscriptionActive ? 'SUBSCRIBE' : 'PLAY'}</div>
                                                    </div>
                                                </div>
                                                <h3 style={styles.cardTitle}>{game.title}</h3>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <AddGameModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onGameAdded={() => { setIsAddModalOpen(false); fetchGames(); }} />
            <EditGameModal
                isOpen={!!editingGame}
                game={editingGame}
                onClose={() => setEditingGame(null)}
                onGameUpdated={() => { setEditingGame(null); fetchGames(); }}
            />
            <SubscribeModal
                isOpen={isSubscribeModalOpen}
                onClose={() => setIsSubscribeModalOpen(false)}
                onSubscribe={handleSubscribe}
                gameTitle={selectedPaidGame?.title}
            />
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", paddingBottom: '50px' },
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 50px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' },
    logo: { margin: 0, color: '#e50914', fontSize: '42px', fontFamily: '"Arial Black", Impact, sans-serif', fontWeight: '900', letterSpacing: '-2px', transform: 'scaleY(1.3)', display: 'inline-block', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', cursor: 'pointer' },
    navControls: { display: 'flex', gap: '15px', alignItems: 'center' },
    consoleToggleButton: { padding: '8px 20px', backgroundColor: '#3d4450', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: 20 },
    addButton: { padding: '8px 16px', backgroundColor: 'rgba(109, 109, 110, 0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', backdropFilter: 'blur(4px)' },
    logoutButton: { padding: '8px 16px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },

    // --- NETFLIX HERO STYLES ---
    hero: { position: 'relative', height: '65vh', minHeight: '400px', backgroundImage: "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center 20%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 50px' },
    heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(20,20,20,0.8) 0%, rgba(20,20,20,0) 100%), linear-gradient(to bottom, rgba(20,20,20,0) 60%, #141414 100%)', zIndex: 1 },
    heroContent: { position: 'relative', zIndex: 2, maxWidth: '600px', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' },
    heroTitle: { fontSize: '4rem', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '1px' },
    heroSubtitle: { fontSize: '1.5rem', fontWeight: '400', margin: 0, color: '#e5e5e5' },

    // --- NEW BILLBOARD STYLES ---
    // Notice the marginTop: '-80px' and zIndex: 3! This pulls the Billboard UP over the Hero fade.
    billboardSection: { padding: '0 50px 20px 50px', position: 'relative', zIndex: 3, marginTop: '-80px' },
    billboardHeading: { color: '#fff', margin: '0 0 15px 0', fontSize: '1.2rem', letterSpacing: '1px', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' },

    // ... leave the rest of the billboard styles exactly as they were! ...

    // --- CATALOG STYLES ---

    billboardContainer: { display: 'flex', alignItems: 'center', gap: '10px', height: '350px' },
    arrowBtn: { backgroundColor: 'transparent', color: '#fff', border: 'none', fontSize: '3rem', cursor: 'pointer', opacity: 0.5, transition: 'opacity 0.2s', padding: '0 10px' },

    // Left side image
    billboardLeft: { flex: 1.8, position: 'relative', overflow: 'hidden' },
    billboardBlurBg: { position: 'absolute', top: -20, left: -20, right: -20, bottom: -20, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(15px)', opacity: 0.5, zIndex: 1 },
    billboardImg: { width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 2, backgroundColor: 'rgba(0,0,0,0.4)' },

    // Right side panel
    billboardRight: { flex: 1, backgroundColor: '#0f1922', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 3, boxShadow: '-10px 0 20px rgba(0,0,0,0.5)' },
    billboardTitle: { margin: 0, fontSize: '1.8rem', color: '#fff', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' },
    billboardMiniShots: { display: 'flex', gap: '10px', marginTop: '15px' },
    miniShot: { flex: 1, height: '60px', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '4px', opacity: 0.8 },
    billboardDesc: { color: '#acb2b8', fontSize: '0.9rem', lineHeight: '1.4', marginTop: '15px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    billboardTags: { display: 'flex', gap: '8px', marginTop: '15px' },
    billboardAction: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '15px' },
    playNowBtn: { backgroundColor: '#4caf50', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' },

    dotsContainer: { display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '15px' },
    dot: { width: '12px', height: '8px', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.3s' },

    // --- CATALOG STYLES ---
    catalogSection: { padding: '20px 50px 40px 50px' }, // Removed negative margin here since the billboard has it now
    sectionTitle: { fontSize: '1.4rem', color: '#fff', marginBottom: '20px', fontWeight: 'bold' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' },
    deleteButton: { position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(20, 20, 20, 0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 20, backdropFilter: 'blur(4px)' },
    editButton: { position: 'absolute', top: '10px', right: '50px', backgroundColor: 'rgba(20, 20, 20, 0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 20, backdropFilter: 'blur(4px)' },
    cardTitle: { marginTop: '10px', color: '#e5e5e5', fontSize: '1rem', textAlign: 'center', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    recentCard: { minWidth: '280px', backgroundColor: '#1c1c1c', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #333' },
    recentImage: { width: '100%', height: '120px', objectFit: 'cover', borderBottom: '2px solid #e50914' },
    recentInfo: { padding: '15px' },



    // --- STEAM BIG PICTURE STYLES ---
    steamContainer: { height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingTop: '40px' },
    carouselWrapper: { width: '100%', height: '380px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' },
    carouselTrack: { display: 'flex', gap: '20px', transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', position: 'absolute', left: 0 },
    steamCard: { width: '240px', height: '320px', transition: 'all 0.4s ease', opacity: 0.5, transform: 'scale(0.85)', cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' },
    steamCardActive: { width: '240px', height: '320px', transition: 'all 0.4s ease', opacity: 1, transform: 'scale(1.15)', zIndex: 10, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 0 25px rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.8)', position: 'relative' },
    steamImage: { width: '100%', height: '100%', objectFit: 'cover' },
    activeIcon: { position: 'absolute', bottom: '10px', right: '10px', fontSize: '1.5rem', backgroundColor: 'rgba(0,0,0,0.6)', padding: '5px', borderRadius: '50%' },
    focusedGameInfo: { marginTop: '50px', textAlign: 'center', animation: 'fadeIn 0.5s ease-in' },

    loadingScreen: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#141414', color: '#e50914' },
    error: { color: '#e50914', padding: '10px', backgroundColor: 'rgba(229, 9, 20, 0.1)', borderRadius: '4px', margin: '20px 50px', position: 'relative', zIndex: 100 },
    noGames: { color: '#aaa', gridColumn: '1 / -1', fontSize: '1.2rem' },
    // --- SEARCH BAR STYLES ---
    searchContainer: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '4px', backdropFilter: 'blur(4px)', transition: 'border-color 0.3s' },
    searchInput: { backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', paddingLeft: '8px', fontSize: '0.95rem', width: '200px' },
    rowWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    rowArrow: {
        position: 'absolute',
        top: 0,
        bottom: '10px',
        width: '50px',
        color: '#fff',
        fontSize: '2.5rem',
        border: 'none',
        cursor: 'pointer',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.8,
        transition: 'transform 0.2s, opacity 0.2s'
    },



};