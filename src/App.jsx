import React, { useRef, useEffect, useState } from 'react';

// Game settings
const SETTINGS = {
  LERP: 0.1,        // Kite responsiveness
  SPEED_BOOST: 8,
  SPEED_ENEMY: 3.5,
  WIN_SCORE: 5,
  MAX_STAMINA: 100
};

const SankrantiKiteGame = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // UI State
  const [view, setView] = useState('menu'); // menu, playing, wish
  const [score, setScore] = useState({ cuts: 0, outcome: '' });
  const [btnActive, setBtnActive] = useState(false); // Mobile btn visual state

  // Engine State
  const engine = useRef({
    w: 0, h: 0,
    loopId: null,
    frame: 0,
    active: false,
    
    // Game Objects
    hero: { x: 0, y: 0, tx: 0, ty: 0, angle: 0, boosting: false, energy: 100 },
    enemies: [],
    sparks: [],
    popups: [],
    
    // Inputs
    input: { x: 0, y: 0, down: false }
  });

  // --- Setup & Resize ---
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      const { innerWidth: w, innerHeight: h } = window;
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      engine.current.w = w;
      engine.current.h = h;
    };

    const updateInput = (clientX, clientY) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      engine.current.input.x = clientX - rect.left;
      engine.current.input.y = clientY - rect.top;
    };

    // Listeners
    const onMove = e => updateInput(e.clientX, e.clientY);
    const onTouch = e => updateInput(e.touches[0].clientX, e.touches[0].clientY);
    
    // Desktop click-to-boost
    const onDown = () => { engine.current.input.down = true; };
    const onUp = () => { engine.current.input.down = false; };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    
    // Mobile: Passive false prevents scrolling while playing
    window.addEventListener('touchmove', onTouch, { passive: false });
    
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouch);
      cancelAnimationFrame(engine.current.loopId);
    };
  }, []);

  // --- Game Logic ---

  const start = () => {
    if (engine.current.loopId) cancelAnimationFrame(engine.current.loopId);
    
    setView('playing');
    setScore({ cuts: 0, outcome: '' });

    const state = engine.current;
    state.active = true;
    state.frame = 0;
    state.enemies = [];
    state.sparks = [];
    state.popups = [];
    
    // Center hero
    state.hero.energy = SETTINGS.MAX_STAMINA;
    state.hero.x = state.w / 2;
    state.hero.y = state.h - 150;
    state.hero.tx = state.w / 2;
    state.hero.ty = state.h - 150;

    run();
  };

  const run = () => {
    if (!engine.current.active) return;
    update();
    render();
    engine.current.loopId = requestAnimationFrame(run);
  };

  const update = () => {
    const state = engine.current;
    const h = state.hero;
    state.frame++;

    // 1. Move Hero (Lerp)
    h.tx = state.input.x;
    h.ty = state.input.y;
    h.x += (h.tx - h.x) * SETTINGS.LERP;
    h.y += (h.ty - h.y) * SETTINGS.LERP;
    h.angle = (h.tx - h.x) * 0.05; 

    // 2. Boost Logic
    h.boosting = state.input.down && h.energy > 0;
    
    if (h.boosting) h.energy = Math.max(0, h.energy - 1.5);
    else h.energy = Math.min(SETTINGS.MAX_STAMINA, h.energy + 0.5);

    // 3. Spawning
    if (state.enemies.length < 4 && state.frame % 50 === 0) addEnemy();

    // 4. Collisions
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      let e = state.enemies[i];
      e.y += SETTINGS.SPEED_ENEMY;
      e.x += Math.sin(state.frame * 0.05 + e.offset) * 2; 

      const dist = Math.hypot(h.x - e.x, h.y - e.y);
      if (dist < 60) {
        if (h.boosting) {
          // Win interaction
          shakeScreen();
          spawnSparks(e.x, e.y, '#FFD700'); 
          state.popups.push({ x: e.x, y: e.y, txt: "KAI PO CHE!", life: 60, col: "#FFD700" });
          state.enemies.splice(i, 1);
          
          setScore(prev => {
             const newCuts = prev.cuts + 1;
             if (newCuts >= SETTINGS.WIN_SCORE) endGame('win');
             return { ...prev, cuts: newCuts };
          });
        } else {
          // Lose interaction
          shakeScreen();
          spawnSparks(h.x, h.y, '#FF4500');
          endGame('loss');
        }
      }
      if (e.y > state.h + 100) state.enemies.splice(i, 1);
    }

    updateParticles(state);
  };

  const addEnemy = () => {
    engine.current.enemies.push({
      x: Math.random() * engine.current.w,
      y: -100,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
      offset: Math.random() * 100
    });
  };

  const shakeScreen = () => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    el.classList.remove('shake');
    void el.offsetWidth; 
    el.classList.add('shake');
  };

  const endGame = (res) => {
    engine.current.active = false;
    setScore(prev => ({ ...prev, outcome: res }));
    render(); 
    setTimeout(() => setView('wish'), 800);
  };

  // --- Input Handlers (Mobile Boost) ---
  const handleBoostStart = (e) => {
    e.preventDefault(); 
    engine.current.input.down = true;
    setBtnActive(true);
  };

  const handleBoostEnd = (e) => {
    e.preventDefault();
    engine.current.input.down = false;
    setBtnActive(false);
  };

  // --- Rendering ---
  const render = () => {
    const ctx = canvasRef.current.getContext('2d');
    const state = engine.current;
    
    ctx.clearRect(0, 0, state.w, state.h);

    // Enemy Strings
    state.enemies.forEach(e => {
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x, e.y - 1000); 
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        
        ctx.beginPath(); ctx.arc(e.x, e.y, 10, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; ctx.fill();
    });

    // Player String
    const h = state.hero;
    ctx.beginPath(); ctx.moveTo(h.x, h.y + 40);
    ctx.quadraticCurveTo(state.w / 2, state.h, state.w / 2, state.h); 
    ctx.strokeStyle = h.boosting ? '#FF4500' : 'white';
    ctx.lineWidth = h.boosting ? 4 : 2; ctx.stroke();

    // Kites
    state.enemies.forEach(e => drawKite(ctx, e.x, e.y, e.color, 0, false));
    drawKite(ctx, h.x, h.y, '#FF6D00', h.angle, true);

    // Particles/Text
    state.sparks.forEach(p => {
        ctx.fillStyle = p.col; ctx.globalAlpha = p.life / 40;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0;
    });
    state.popups.forEach(p => {
        ctx.font = "900 40px sans-serif"; ctx.fillStyle = p.col;
        ctx.strokeStyle = "black"; ctx.lineWidth = 4;
        ctx.strokeText(p.txt, p.x, p.y); ctx.fillText(p.txt, p.x, p.y);
    });
  };

  const drawKite = (ctx, x, y, color, angle, isHero) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle * Math.PI / 180);
    const s = isHero ? 1.3 : 1; 
    ctx.scale(s, s);

    // Tail
    const sway = Math.sin(engine.current.frame * 0.2) * 10;
    ctx.beginPath(); ctx.moveTo(0, 40); 
    ctx.lineTo(-10 + (sway/2), 70); ctx.lineTo(10 + (sway/2), 70);
    ctx.fillStyle = color; ctx.fill();

    // Body
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(35, 0); 
    ctx.lineTo(0, 50); ctx.lineTo(-35, 0); ctx.closePath();
    
    const grad = ctx.createLinearGradient(-35, -50, 35, 50);
    grad.addColorStop(0, color); grad.addColorStop(1, isHero ? '#FFD700' : '#FFF'); 
    ctx.fillStyle = grad; ctx.fill();

    // Spines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-35, 0); ctx.quadraticCurveTo(0, -15, 35, 0); ctx.stroke();

    if (isHero && engine.current.hero.boosting) {
        ctx.shadowBlur = 20; ctx.shadowColor = "#FFD700"; 
        ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.restore();
  };

  const spawnSparks = (x, y, col) => {
    for(let i=0; i<20; i++) {
        engine.current.sparks.push({
            x, y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15,
            life: 40, size: 4 + Math.random() * 4, col
        });
    }
  };

  const updateParticles = (state) => {
    for(let i=state.sparks.length-1; i>=0; i--) {
        let p = state.sparks[i]; p.x += p.vx; p.y += p.vy; p.life--;
        if(p.life <= 0) state.sparks.splice(i, 1);
    }
    for(let i=state.popups.length-1; i>=0; i--) {
        let t = state.popups[i]; t.y -= 2; t.life--;
        if(t.life <= 0) state.popups.splice(i, 1);
    }
  };

  const shareWish = async () => {
    const data = {
        title: "Happy Makar Sankranti! ☀️🪁",
        text: `☀️ Happy Makar Sankranti! 🪁\n\nI scored ${score.cuts} in the Ansh Infotech Sankranti Challenge!\n\nCan you beat my score?`,
        url: window.location.href,
    };
    try {
        if (navigator.share) await navigator.share(data);
        else {
            await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
            alert("Copied to clipboard! ☀️");
        }
    } catch (e) { console.log(e); }
  };

  // --- Styles ---
  const styles = {
    wrap: { 
        position: 'relative', width: '100%', height: '100vh', overflow: 'hidden',
        background: 'linear-gradient(to bottom, #2980b9 0%, #6dd5fa 100%)', // Sunny Sky
        fontFamily: "sans-serif", userSelect: 'none', touchAction: 'none'
    },
    skyline: {
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: '180px', background: '#2c3e50',
        clipPath: 'polygon(0% 100%, 0% 40%, 10% 20%, 20% 60%, 30% 40%, 40% 50%, 50% 30%, 60% 50%, 70% 40%, 80% 20%, 90% 60%, 100% 40%, 100% 100%)',
        zIndex: 1
    },
    brand: { position: 'absolute', bottom: 10, right: 10, color: 'rgba(255,255,255,0.8)', fontSize: '14px', zIndex: 10, fontWeight: 'bold' },
    hud: { position: 'absolute', top: 20, left: 20, zIndex: 10 },
    stats: { 
        background: 'rgba(255,255,255,0.9)', padding: '10px 20px', borderRadius: '30px', 
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)', display: 'flex', gap: '15px', alignItems: 'center' 
    },
    bar: { width: '120px', height: '12px', background: '#ddd', borderRadius: '6px', overflow: 'hidden' },
    
    // Mobile Boost Button
    boostBtn: {
        position: 'absolute', bottom: '30px', right: '20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: btnActive ? '#FFD700' : 'rgba(255, 255, 255, 0.2)',
        border: '4px solid white',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        fontSize: '40px', zIndex: 50, userSelect: 'none',
        boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(4px)',
        transform: btnActive ? 'scale(0.9)' : 'scale(1)',
        transition: 'all 0.1s'
    },
    
    // Modal
    modal: { 
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 20
    },
    card: { 
        background: 'white', padding: '30px', borderRadius: '25px', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)', 
        maxWidth: '90%', width: '400px', // Responsive width
        border: '5px solid #FFD700' 
    },
    // Responsive Typography
    h1: { color: '#FF6D00', margin: 0, fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontFamily: 'serif' },
    p: { color: '#777', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)' },
    
    btn: {
        background: 'linear-gradient(45deg, #FF512F, #DD2476)', border: 'none', color: 'white',
        padding: '12px 30px', borderRadius: '50px', fontSize: '1rem', fontWeight: 'bold',
        cursor: 'pointer', margin: '10px', boxShadow: '0 5px 15px rgba(221, 36, 118, 0.4)'
    },
    btnOut: {
        background: 'transparent', color: '#FF512F', border: '2px solid #FF512F',
        padding: '12px 30px', borderRadius: '50px', fontSize: '1rem', fontWeight: 'bold',
        cursor: 'pointer', margin: '10px'
    }
  };

  return (
    <div ref={containerRef} style={styles.wrap}>
      <style>{`@keyframes shake { 0% {transform:translate(0,0)} 25% {transform:translate(-3px,0)} 75% {transform:translate(3px,0)} 100% {transform:translate(0,0)} } .shake {animation: shake 0.3s}`}</style>

      <div style={styles.skyline}></div>
      <canvas ref={canvasRef} style={{ display: 'block', position: 'relative', zIndex: 5 }} />
      <div style={styles.brand}>Powered by Ansh Infotech</div>

      {view === 'playing' && (
        <>
          <div style={styles.hud}>
            <div style={styles.stats}>
              <span style={{fontSize: '24px'}}>✂️ <b>{score.cuts}</b></span>
              <div>
                  <div style={styles.bar}>
                      <div style={{ height: '100%', width: `${engine.current.hero.energy}%`, background: engine.current.hero.energy < 20 ? 'red' : '#00C853', transition: 'width 0.1s' }} />
                  </div>
              </div>
            </div>
          </div>
          {/* Mobile Boost Button */}
          <div 
             style={styles.boostBtn}
             onMouseDown={handleBoostStart} onMouseUp={handleBoostEnd}
             onTouchStart={handleBoostStart} onTouchEnd={handleBoostEnd}
          >⚡</div>
        </>
      )}

      {view !== 'playing' && (
        <div style={styles.modal}>
          <div style={styles.card}>
            {view === 'menu' ? (
              <>
                <h1 style={{...styles.h1, fontFamily: 'sans-serif'}}>Sankranti Challenge</h1>
                <p style={styles.p}>Hold <b>Button</b> or <b>Click</b> to Boost!</p>
                <button style={styles.btn} onClick={start}>Start Flying</button>
              </>
            ) : (
              <>
                <div style={{fontSize: '40px'}}>☀️</div>
                <h1 style={styles.h1}>Happy Sankranti!</h1>
                <h3 style={{margin: '10px 0', color: '#555'}}>{score.outcome === 'win' ? "Victory!" : "Well Played!"}</h3>
                <p style={styles.p}>
                  {score.outcome === 'win' ? `You ruled the sky with ${score.cuts} cuts!` : `Score: ${score.cuts} cuts.`}
                  <br/>Wishing you joy & prosperity.
                </p>
                <div style={{marginTop: '20px'}}>
                  <button style={styles.btn} onClick={start}>Fly Again</button>
                  <button style={styles.btnOut} onClick={shareWish}>Share</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SankrantiKiteGame;