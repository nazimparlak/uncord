import React, { useState, useEffect, useRef } from 'react';
import {
    FaPlay, FaPause, FaStepBackward, FaStepForward,
    FaBomb, FaDownload, FaSpinner, FaYoutube,
    FaVolumeUp, FaVolumeDown, FaVolumeMute,
    FaComments, FaPaperPlane
} from 'react-icons/fa';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://pixelamca.com';

// Orb (Visualizer) Bileşeni
const Orb = ({ position, rotation, beatStrength, rayHeights, isPlaying, opacity = 1 }) => (
    <div className="absolute w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center pointer-events-none transition-opacity duration-500"
         style={{ transform: `translate3d(calc(${position.x}vw - 50%), calc(${position.y}vh - 50%), 0) rotate(${rotation}deg) scale(${1 + beatStrength * 0.4})`, opacity, zIndex: 1 }}>
        <div className="absolute inset-0 bg-purple-500/40 rounded-full blur-[80px]" style={{ opacity: isPlaying ? (beatStrength * 0.9) : 0.1, transform: `scale(${1 + beatStrength * 3.5})` }}></div>
        <div className="absolute inset-0 flex items-center justify-center">
            {rayHeights.map((height, i) => (
                <div key={i} className="absolute bg-gradient-to-t from-purple-400/90 via-purple-600/50 to-transparent blur-[4px] rounded-full"
                     style={{ width: `${2 + beatStrength * 5}px`, height: `${height * 0.8}%`, transform: `rotate(${i * (360 / rayHeights.length)}deg)`, transformOrigin: '50% 100%', bottom: '50%', left: '50%', marginLeft: '-1px', transition: isPlaying ? 'height 0.04s linear' : 'height 0.8s ease-out', opacity: isPlaying ? (0.3 + (height / 250)) : 0.1 }}></div>
            ))}
        </div>
        <div className="relative z-10 bg-white rounded-full blur-[1px]" style={{ width: `${45 + beatStrength * 60}px`, height: `${45 + beatStrength * 60}px`, boxShadow: `0 0 ${40 + beatStrength * 150}px #f0f, 0 0 ${20 + beatStrength * 80}px #fff` }}></div>
    </div>
);

const App = () => {
    const [library, setLibrary] = useState([]);
    const [currentTrack, setCurrentTrack] = useState({ id: '0', title: 'Müzik Seçin', url: '', cover: '' });
    const [ytUrl, setYtUrl] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.7);
    const [rotation, setRotation] = useState(0);

    // Chat states
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [username, setUsername] = useState(() => {
        const saved = localStorage.getItem('chat_username');
        return saved || `Kullanıcı${Math.floor(Math.random() * 1000)}`;
    });
    const messagesEndRef = useRef(null);
    const MAX_MESSAGES = 100;

    const [orbPositions, setOrbPositions] = useState({ 
        1: {x:50, y:50}, 
        2: {x:20, y:80}, 
        3: {x:80, y:20}, 
        4: {x:30, y:30}
    });
    const [orbRotation, setOrbRotation] = useState(0);
    const [rayHeights, setRayHeights] = useState(new Array(36).fill(0));
    const [beatStrength, setBeatStrength] = useState(0);

    const audioRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyzerRef = useRef(null);
    const animationRef = useRef(null);
    const lastTimeRef = useRef(performance.now());
    const orbAngleRef = useRef(0);
    const fadeIntervalRef = useRef(null);

    // API'den gelen thumbnail'i ayıklama
    const getBestThumbnail = (trackData) => {
        try {
            if (trackData.thumbnail?.thumbnails) {
                const thumbs = trackData.thumbnail.thumbnails;
                return thumbs[thumbs.length - 1].url;
            }
            if (trackData.cover) return trackData.cover;
            return 'https://via.placeholder.com/500';
        } catch(e) { return 'https://via.placeholder.com/500'; }
    };

    const fetchLibrary = async () => {
        setLoadingLibrary(true);
        try {
            const response = await fetch(`${API_BASE}/get_library.php`, { cache: 'no-store' });
            const data = await response.json();
            const formatted = (data || []).map(track => ({
                ...track,
                processedCover: getBestThumbnail(track),
                artist: track.artist || 'Kullanıcı Kütüphanesi'
            }));
            setLibrary(formatted);
            if (formatted.length > 0 && !currentTrack.url) setCurrentTrack(formatted[0]);
        } catch (error) {
            console.error("Hata:", error);
            setStatusMessage('Kütüphane yüklenemedi, lütfen yenileyin.');
        }
        finally { setLoadingLibrary(false); }
    };

    useEffect(() => { fetchLibrary(); }, []);

    const initAudioEngine = () => {
        if (!audioRef.current || audioContextRef.current) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        audioRef.current.crossOrigin = "anonymous";
        const source = audioContext.createMediaElementSource(audioRef.current);
        source.connect(analyzer);
        analyzer.connect(audioContext.destination);
        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;
    };

    const playTrack = async (track) => {
        if (!audioRef.current) return;
        setIsPlaying(false);
        const cacheBuster = `?t=${Date.now()}`;
        const finalUrl = track.url.split('?')[0] + cacheBuster;
        setCurrentTrack({ ...track, url: finalUrl, cover: track.processedCover });
        audioRef.current.src = finalUrl;
        audioRef.current.load();
        if (!audioContextRef.current) initAudioEngine();
        // Otomatik çalma kaldırıldı - sadece track yükleniyor, play tuşuna basılana kadar çalmıyor
    };

    const handleDownload = async (e) => {
        e?.preventDefault();
        if (!ytUrl.trim()) {
            setStatusMessage('YouTube linki ekleyin.');
            return;
        }
        setIsDownloading(true);
        setStatusMessage('İndiriliyor...');
        try {
            const response = await fetch(`${API_BASE}/download.php?url=${encodeURIComponent(ytUrl.trim())}`);
            const data = await response.json();
            if (data.status === "success") {
                setStatusMessage('İndirme tamamlandı, kütüphane yenileniyor.');
                setYtUrl("");
                await fetchLibrary();
            } else {
                setStatusMessage(data.message || "İndirme hatası.");
            }
        } catch (error) {
            setStatusMessage("Sunucu hatası.");
        }
        finally {
            setIsDownloading(false);
            setTimeout(() => setStatusMessage(''), 2500);
        }
    };

    // Görsel Döngü (Frame Loop)
    useEffect(() => {
        const analyze = (currentTime) => {
            const deltaTime = currentTime - lastTimeRef.current;
            lastTimeRef.current = currentTime;
            let strength = 0;
            if (isPlaying && analyzerRef.current) {
                const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
                analyzerRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < 15; i++) sum += dataArray[i];
                strength = Math.pow((sum / 15) / 255, 1.3);
            }

            setBeatStrength(strength);
            document.documentElement.style.setProperty('--beat-scale', 1 + strength * 0.18);
            document.documentElement.style.setProperty('--beat-opacity', 0.2 + strength * 1.8);

            // Her zaman dönsün; müzik açıldığında hız/ışık artsın
            const spinBoost = isPlaying ? strength * 0.3 : 0;
            const orbBoost = isPlaying ? strength * 0.4 : 0;
            setRotation(prev => prev + deltaTime * (0.03 + spinBoost));
            setOrbRotation(prev => prev + deltaTime * (0.03 + orbBoost));

            // Yörünge hareketi
            const baseOrbitSpeed = 0.00025;
            const orbitSpeed = baseOrbitSpeed + (isPlaying ? strength * 0.00025 : 0);
            orbAngleRef.current += deltaTime * orbitSpeed;
            const a = orbAngleRef.current;
            setOrbPositions({
                1: { x: 50 + Math.cos(a) * 42, y: 50 + Math.sin(a * 0.8) * 42 },
                2: { x: 50 + Math.sin(a * 1.2) * 38, y: 50 + Math.cos(a * 0.9) * 38 },
                3: { x: 50 + Math.cos(a * 0.5 + 2) * 48, y: 50 + Math.sin(a * 1.5) * 28 },
                4: { x: 50 + Math.sin(a * 0.7 - 1) * 32, y: 50 + Math.cos(a * 1.1 + 3) * 42 }
            });

            // Ses dalgaları: oynarken güçlü, dururken hafif nefes alan efekt
            const baseRay = isPlaying ? 0 : 6;
            const rayNoise = isPlaying ? (strength * 160) : 4;
            setRayHeights(prev => prev.map(() => baseRay + Math.random() * rayNoise));
            animationRef.current = requestAnimationFrame(analyze);
        };
        animationRef.current = requestAnimationFrame(analyze);
        return () => cancelAnimationFrame(animationRef.current);
    }, [isPlaying]);

    useEffect(() => {
        if (audioRef.current && !fadeIntervalRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Cleanup fade interval on unmount
    useEffect(() => {
        return () => {
            if (fadeIntervalRef.current) {
                clearInterval(fadeIntervalRef.current);
            }
        };
    }, []);

    const fadeAudio = (targetVolume, duration = 400, onComplete) => {
        if (!audioRef.current) return;
        
        // Önceki fade'i iptal et
        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
        }

        const startVolume = audioRef.current.volume;
        const volumeDiff = targetVolume - startVolume;
        const steps = 20;
        const stepDuration = duration / steps;
        let currentStep = 0;

        fadeIntervalRef.current = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2; // Ease in-out
            
            const newVolume = startVolume + (volumeDiff * easeProgress);
            audioRef.current.volume = newVolume;

            if (currentStep >= steps) {
                clearInterval(fadeIntervalRef.current);
                fadeIntervalRef.current = null;
                if (onComplete) onComplete();
            }
        }, stepDuration);
    };

    const togglePlay = async () => {
        if (!audioRef.current) return;
        if (!currentTrack.url) return;
        if (!audioContextRef.current) initAudioEngine();
        if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
        
        if (isPlaying) {
            // Fade out
            fadeAudio(0, 300, () => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.volume = volume; // Volume'u geri yükle
                }
            });
            setIsPlaying(false);
        } else {
            try {
                // Volume'u 0'dan başlat ve fade in yap
                audioRef.current.volume = 0;
                await audioRef.current.play();
                setIsPlaying(true);
                fadeAudio(volume, 400);
            } catch (e) {
                console.error('Play error:', e);
            }
        }
    };

    const handleNext = () => {
        if (!library.length) return;
        const idx = library.findIndex(t => t.id === currentTrack.id);
        const next = library[(idx + 1) % library.length];
        playTrack(next);
    };

    const handlePrev = () => {
        if (!library.length) return;
        const idx = library.findIndex(t => t.id === currentTrack.id);
        const prev = library[(idx - 1 + library.length) % library.length];
        playTrack(prev);
    };

    // Chat functions
    const fetchMessages = async () => {
        try {
            const response = await fetch(`${API_BASE}/chat_get.php?t=${Date.now()}`, { cache: 'no-store' });
            const data = await response.json();
            if (Array.isArray(data)) {
                setMessages(data);
            }
        } catch (error) {
            console.error("Chat mesajları yüklenemedi:", error);
        }
    };

    const sendMessage = async (e) => {
        e?.preventDefault();
        if (!chatInput.trim() || !username.trim()) return;

        try {
            const response = await fetch(`${API_BASE}/chat_send.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username.trim(),
                    message: chatInput.trim()
                })
            });

            const data = await response.json();
            if (data.status === 'success') {
                setChatInput('');
                // Mesajları hemen güncelle
                await fetchMessages();
            } else {
                alert(data.message || 'Mesaj gönderilemedi');
            }
        } catch (error) {
            console.error("Mesaj gönderme hatası:", error);
            alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
        }
    };

    // Scroll to bottom when new message arrives
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Save username to localStorage
    useEffect(() => {
        localStorage.setItem('chat_username', username);
    }, [username]);

    // Polling: Her 2 saniyede bir mesajları çek
    useEffect(() => {
        fetchMessages(); // İlk yükleme
        const interval = setInterval(fetchMessages, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-screen text-white bg-[#010101] flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
            <audio ref={audioRef} src={currentTrack.url} crossOrigin="anonymous" onEnded={handleNext} />

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000 opacity-30 blur-[120px]"
                     style={{ backgroundImage: `url(${currentTrack.processedCover || currentTrack.cover})` }}></div>
                <Orb position={orbPositions[1]} rotation={orbRotation} beatStrength={beatStrength} rayHeights={rayHeights} isPlaying={isPlaying} opacity={1} />
                <Orb position={orbPositions[2]} rotation={-orbRotation * 0.7} beatStrength={beatStrength} rayHeights={rayHeights} isPlaying={isPlaying} opacity={0.8} />
                <Orb position={orbPositions[3]} rotation={orbRotation * 1.2} beatStrength={beatStrength} rayHeights={rayHeights} isPlaying={isPlaying} opacity={0.75} />
                <Orb position={orbPositions[4]} rotation={-orbRotation * 0.5} beatStrength={beatStrength} rayHeights={rayHeights} isPlaying={isPlaying} opacity={0.85} />
            </div>

            <main className="relative z-10 w-full max-w-7xl flex flex-col items-center justify-center">
                <header className="mb-12 text-center">
                    <h1 className="text-5xl sm:text-7xl font-black tracking-tighter italic-gradient uppercase flex items-center justify-center gap-4">
                        <span className="text-purple-500">Uncord</span> <FaBomb className="text-purple-500" />
                    </h1>
                </header>

                <div className="w-full grid grid-cols-1 lg:grid-cols-[400px_1fr_400px] gap-8 items-center justify-center">
                    {/* Sol Panel: Chat */}
                    <div className="bg-black/40 p-6 rounded-[3rem] border border-white/5 backdrop-blur-3xl h-[650px] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <FaComments className="text-purple-400" size={16} />
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Canlı Chat</h3>
                            </div>
                        </div>
                        
                        {/* Username Input */}
                        <div className="mb-3">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Kullanıcı adı"
                                className="w-full px-3 py-2 text-xs bg-white/5 rounded-xl border border-white/10 focus:border-purple-500/50 focus:outline-none transition-all"
                                maxLength={20}
                            />
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 mb-4">
                            {messages.length === 0 ? (
                                <p className="text-sm text-white/40 text-center mt-10">Henüz mesaj yok. İlk mesajı sen gönder!</p>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all">
                                        <div className="flex items-start gap-2 mb-1">
                                            <span className="text-xs font-bold text-purple-400">{msg.username}</span>
                                            <span className="text-[10px] text-white/30">{msg.timestamp}</span>
                                        </div>
                                        <p className="text-sm text-white/80 break-words">{msg.message}</p>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={sendMessage} className="mt-auto">
                            <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10 focus-within:border-purple-500/50 transition-all">
                                <input
                                    type="text"
                                    placeholder="Mesaj yaz..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="flex-1 bg-transparent border-none py-2 px-3 text-sm focus:outline-none"
                                    maxLength={200}
                                />
                                <button
                                    type="submit"
                                    disabled={!chatInput.trim()}
                                    className="px-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/20"
                                >
                                    <FaPaperPlane size={14} />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Orta Panel: Plak ve Kontroller */}
                    <div className="flex flex-col items-center justify-center gap-10 min-h-[650px]">
                        <div className="relative w-72 h-72 sm:w-[450px] sm:h-[450px]">
                            <div className="absolute inset-[-40px] bg-purple-600/20 rounded-full blur-[100px] transition-all"
                                 style={{ opacity: isPlaying ? 'var(--beat-opacity)' : '0', transform: `scale(var(--beat-scale))` }}></div>

                            <div className="absolute inset-0 rounded-full bg-[#080808] border-[12px] border-zinc-900 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden"
                                 style={{ transform: `rotate(${rotation}deg) scale(var(--beat-scale))` }}>
                                <div className="absolute inset-0 opacity-20" style={{ background: 'repeating-radial-gradient(circle, #444 0px, #000 2px, #444 4px)' }}></div>
                                <div className="absolute inset-[32%] rounded-full overflow-hidden border-[6px] border-[#111] z-20">
                                    <img src={currentTrack.processedCover || currentTrack.cover} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-[#010101] rounded-full -translate-x-1/2 -translate-y-1/2 z-30 shadow-white/20 shadow-lg"></div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 bg-black/60 backdrop-blur-2xl px-12 py-6 rounded-full border border-white/5 shadow-2xl">
                            <button onClick={handlePrev} className="text-white/40 hover:text-white transition-colors disabled:opacity-40" disabled={!library.length}><FaStepBackward size={22} /></button>
                            <button onClick={togglePlay} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-white text-black' : 'bg-purple-600 text-white'} disabled:opacity-50`} disabled={!currentTrack.url}>
                                {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} className="ml-1" />}
                            </button>
                            <button onClick={handleNext} className="text-white/40 hover:text-white transition-colors disabled:opacity-40" disabled={!library.length}><FaStepForward size={22} /></button>
                        </div>
                    </div>

                    {/* Sağ Panel: İndirme ve Kütüphane */}
                    <div className="bg-black/40 p-8 rounded-[3rem] border border-white/5 backdrop-blur-3xl h-[650px] flex flex-col shadow-2xl">
                        {/* YOUTUBE DOWNLOAD SECTION */}
                        <form className="mb-8 group" onSubmit={handleDownload}>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3 block px-1">YouTube'dan Ekle</label>
                            <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10 focus-within:border-purple-500/50 transition-all">
                                <div className="flex items-center pl-3 text-red-500"><FaYoutube size={18} /></div>
                                <input
                                    type="text"
                                    placeholder="Link yapıştır..."
                                    value={ytUrl}
                                    onChange={(e) => setYtUrl(e.target.value)}
                                    className="flex-1 bg-transparent border-none py-3 px-2 text-sm focus:outline-none"
                                />
                                <button
                                    disabled={isDownloading}
                                    className={`px-5 rounded-xl flex items-center justify-center transition-all ${isDownloading ? 'bg-zinc-800' : 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/20'}`}
                                >
                                    {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                                </button>
                            </div>
                            {statusMessage && <p className="text-[11px] text-purple-200 mt-2 px-2">{statusMessage}</p>}
                        </form>

                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Kütüphane</h3>
                            <button type="button" onClick={fetchLibrary} className="text-[10px] text-white/50 hover:text-white transition-colors">Yenile</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {loadingLibrary ? (
                                <FaSpinner className="animate-spin mx-auto mt-10 text-purple-500" />
                            ) : library.length === 0 ? (
                                <p className="text-sm text-white/40 text-center mt-10">Henüz indirilen mp3 yok.</p>
                            ) : (
                                library.map(track => {
                                    const isCurrent = currentTrack.url.split('?')[0] === track.url;
                                    return (
                                        <div
                                            key={track.id}
                                            onClick={() => playTrack(track)}
                                            className={`p-3 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border ${isCurrent ? 'bg-purple-600/20 border-purple-500/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                        >
                                            <div className="relative w-12 h-12 flex-shrink-0">
                                                <img src={track.processedCover} className="w-full h-full rounded-xl object-cover shadow-lg" alt="" />
                                                {isCurrent && isPlaying && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${isCurrent ? 'text-purple-300' : 'text-white/80'}`}>{track.title}</p>
                                                <p className="text-[9px] text-white/30 font-black uppercase tracking-tighter">MP3 Audio Source</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Volume Control */}
                        <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {volume === 0 ? (
                                            <FaVolumeMute className="text-white/60" size={16} />
                                        ) : volume < 0.5 ? (
                                            <FaVolumeDown className="text-white/60" size={16} />
                                        ) : (
                                            <FaVolumeUp className="text-white/60" size={16} />
                                        )}
                                        <span className="text-[10px] text-white/40 font-black uppercase tracking-wider">Ses Seviyesi</span>
                                    </div>
                                    <span className="text-xs font-bold text-purple-400">{Math.round(volume * 100)}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            if (fadeIntervalRef.current) {
                                                clearInterval(fadeIntervalRef.current);
                                                fadeIntervalRef.current = null;
                                            }
                                            const newVolume = Math.max(0, volume - 0.1);
                                            setVolume(newVolume);
                                            if (audioRef.current) audioRef.current.volume = newVolume;
                                        }}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                                    >
                                        <FaVolumeDown size={14} />
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={volume}
                                        onChange={(e) => {
                                            if (fadeIntervalRef.current) {
                                                clearInterval(fadeIntervalRef.current);
                                                fadeIntervalRef.current = null;
                                            }
                                            const v = parseFloat(e.target.value);
                                            setVolume(v);
                                            if (audioRef.current) audioRef.current.volume = v;
                                        }}
                                        className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer volume-slider"
                                        style={{
                                            background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%, rgba(255,255,255,0.1) 100%)`
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            if (fadeIntervalRef.current) {
                                                clearInterval(fadeIntervalRef.current);
                                                fadeIntervalRef.current = null;
                                            }
                                            const newVolume = Math.min(1, volume + 0.1);
                                            setVolume(newVolume);
                                            if (audioRef.current) audioRef.current.volume = newVolume;
                                        }}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                                    >
                                        <FaVolumeUp size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                :root { --beat-scale: 1; --beat-opacity: 0.2; }
                .italic-gradient { background: linear-gradient(to bottom, #fff 0%, #777 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(147, 51, 234, 0.3); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(147, 51, 234, 0.6); }
                .volume-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #a855f7;
                    cursor: pointer;
                    box-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
                    transition: all 0.2s;
                }
                .volume-slider::-webkit-slider-thumb:hover {
                    background: #9333ea;
                    box-shadow: 0 0 12px rgba(168, 85, 247, 0.8);
                    transform: scale(1.1);
                }
                .volume-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #a855f7;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
                    transition: all 0.2s;
                }
                .volume-slider::-moz-range-thumb:hover {
                    background: #9333ea;
                    box-shadow: 0 0 12px rgba(168, 85, 247, 0.8);
                    transform: scale(1.1);
                }
            `}</style>
        </div>
    );
};

export default App;