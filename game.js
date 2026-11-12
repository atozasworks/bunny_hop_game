const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const heartsEl = document.getElementById('hearts');
const worldBadge = document.getElementById('world-badge');
const feverBar = document.getElementById('fever-bar');
const feverText = document.getElementById('fever-text');
const powerupBanner = document.getElementById('powerup-banner');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const startBtn = document.getElementById('start-btn');
const playerNameSelect = document.getElementById('player-name');
const leaderboardList = document.getElementById('leaderboard-list');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'star') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(900, now + 0.07);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.08);
        osc.frequency.setValueAtTime(800, now + 0.16);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'bounce') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
    }
}

const worlds = [
    { name: 'Sunny Meadow', sky: '#87CEEB', ground: '#8AC926', rim: '#5E8B18', gravity: 0.65, badgeColor: '#8AC926' },
    { name: 'Candy Land', sky: '#FFC8DD', ground: '#FF70A6', rim: '#FF477E', gravity: 0.62, badgeColor: '#FF70A6' },
    { name: 'Moon Space', sky: '#1D1E2C', ground: '#9D4EDD', rim: '#7B2CBF', gravity: 0.45, badgeColor: '#7B2CBF' }
];
let currentWorldIndex = 0;

const heroEmojis = {
    'SuperBunny': '🐰',
    'HappyTiger': '🐯',
    'StarPanda': '🐼',
    'TurboFox': '🦊',
    'MagicUnicorn': '🦄',
    'SunnyLion': '🦁'
};

let isPlaying = false;
let score = 0;
let highScore = localStorage.getItem('wonderDashHigh') || 0;
highScoreEl.textContent = highScore;

let hearts = 3;
let invulnerableTimer = 0;
let feverMeter = 0;
let feverTimer = 0;
let activePowerup = null;
let powerupTimer = 0;
let gameSpeed = 5.2;
let frameCount = 0;
const groundY = 335;

const player = {
    x: 95,
    y: groundY - 50,
    size: 48,
    dy: 0,
    jumpPower: -13.5,
    jumpsLeft: 1
};

let obstacles = [];
let stars = [];
let eggs = [];
let particles = [];
let rainbowTrail = [];
function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            color: color
        });
    }
}

function updateHeartsUI() {
    heartsEl.textContent = '❤️'.repeat(Math.max(0, hearts)) + '🤍'.repeat(Math.max(0, 3 - hearts));
}

function updateWorldUI() {
    const w = worlds[currentWorldIndex];
    worldBadge.textContent = w.name;
    worldBadge.style.background = w.badgeColor;
}

function activatePowerup() {
    const types = [
        { id: 'magnet', label: 'Puppy Magnet! Pulling Stars!', duration: 450 },
        { id: 'wings', label: 'Unicorn Wings! Double Jump!', duration: 450 },
        { id: 'shield', label: 'Bubble Shield! Safe from 1 Bump!', duration: 600 }
    ];
    const chosen = types[Math.floor(Math.random() * types.length)];
    activePowerup = chosen.id;
    powerupTimer = chosen.duration;
    powerupBanner.textContent = chosen.label;
    powerupBanner.classList.remove('hidden');
    playSound('powerup');
    spawnParticles(player.x + 24, player.y + 24, '#FFCA3A', 20);
}

function resetGame() {
    score = 0;
    hearts = 3;
    invulnerableTimer = 0;
    feverMeter = 0;
    feverTimer = 0;
    activePowerup = null;
    powerupTimer = 0;
    currentWorldIndex = 0;
    gameSpeed = 5.2;
    frameCount = 0;

    obstacles = [];
    stars = [];
    eggs = [];
    particles = [];
    rainbowTrail = [];

    player.y = groundY - player.size;
    player.dy = 0;
    player.jumpsLeft = 1;

    scoreEl.textContent = score;
    feverBar.style.width = '0%';
    feverText.textContent = 'Collect stars for Rainbow Fever!';
    updateHeartsUI();
    powerupBanner.classList.add('hidden');
    updateWorldUI();

    isPlaying = true;
    overlay.classList.add('hidden');
    requestAnimationFrame(gameLoop);
}

function jump() {
    if (!isPlaying) return;
    if (player.jumpsLeft > 0) {
        player.dy = player.jumpPower;
        player.jumpsLeft--;
        playSound('jump');
        spawnParticles(player.x + 20, player.y + 45, '#FFFFFF', 6);
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (isPlaying) {
            jump();
        }
    }
});

canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    jump();
});

startBtn.addEventListener('click', resetGame);

playerNameSelect.addEventListener('change', () => {
    if (!isPlaying) {
        drawEnvironment();
        drawPlayer();
    }
});

function drawEnvironment() {
    const w = worlds[currentWorldIndex];
    if (feverTimer > 0) {
        const hue = (frameCount * 6) % 360;
        ctx.fillStyle = `hsl(${hue}, 85%, 78%)`;
    } else {
        ctx.fillStyle = w.sky;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentWorldIndex === 2) {
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 15; i++) {
            const sx = (i * 97 + frameCount) % canvas.width;
            const sy = (i * 43) % 250;
            ctx.fillRect(canvas.width - sx, sy, 3, 3);
        }
    }

    ctx.fillStyle = w.ground;
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    ctx.fillStyle = w.rim;
    ctx.fillRect(0, groundY, canvas.width, 10);
}

function drawPlayer() {
    if (activePowerup === 'wings' || feverTimer > 0) {
        rainbowTrail.push({ x: player.x + 15, y: player.y + 24, life: 20 });
    }

    for (let i = rainbowTrail.length - 1; i >= 0; i--) {
        let t = rainbowTrail[i];
        t.x -= gameSpeed;
        t.life--;
        ctx.fillStyle = `hsla(${(t.life * 18) % 360}, 90%, 60%, ${t.life / 20})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
        ctx.fill();
        if (t.life <= 0) {
            rainbowTrail.splice(i, 1);
        }
    }

    if (invulnerableTimer > 0 && Math.floor(invulnerableTimer / 5) % 2 === 0) {
        ctx.globalAlpha = 0.4;
    }

    ctx.font = '46px Arial';
    const emoji = heroEmojis[playerNameSelect.value] || '🐰';
    ctx.fillText(emoji, player.x, player.y + 42);
    ctx.globalAlpha = 1.0;

    if (activePowerup === 'shield') {
        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth = 4;
        ctx.fillStyle = 'rgba(0, 245, 212, 0.2)';
        ctx.beginPath();
        ctx.arc(player.x + 24, player.y + 24, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}
function updateEntities() {
    if (frameCount % 115 === 0) {
        obstacles.push({
            x: canvas.width + 20,
            y: groundY - 38,
            size: 38,
            emoji: currentWorldIndex === 1 ? '🍭' : (currentWorldIndex === 2 ? '👾' : '🪨')
        });
    }

    if (frameCount % 65 === 0) {
        stars.push({
            x: canvas.width + 20,
            y: groundY - 80 - Math.random() * 85
        });
    }

    if (frameCount % 540 === 0 && !activePowerup) {
        eggs.push({
            x: canvas.width + 20,
            y: groundY - 95
        });
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        if (feverTimer > 0) {
            ctx.font = '36px Arial';
            ctx.fillText('🌟', obs.x, obs.y + 32);
        } else {
            ctx.font = '38px Arial';
            ctx.fillText(obs.emoji, obs.x, obs.y + 34);
        }

        const dist = Math.hypot((player.x + 24) - (obs.x + 19), (player.y + 24) - (obs.y + 19));
        if (dist < 32) {
            if (feverTimer > 0) {
                score += 5;
                scoreEl.textContent = score;
                playSound('star');
                spawnParticles(obs.x, obs.y, '#FFCA3A', 10);
                obstacles.splice(i, 1);
                continue;
            } else if (activePowerup === 'shield') {
                activePowerup = null;
                powerupBanner.classList.add('hidden');
                invulnerableTimer = 60;
                playSound('bounce');
                spawnParticles(player.x + 24, player.y + 24, '#00F5D4', 18);
                obstacles.splice(i, 1);
                continue;
            } else if (invulnerableTimer <= 0) {
                hearts--;
                updateHeartsUI();
                playSound('bounce');
                spawnParticles(player.x + 24, player.y + 24, '#FF595E', 16);
                obstacles.splice(i, 1);

                if (hearts <= 0) {
                    endGame();
                    return;
                } else {
                    invulnerableTimer = 90;
                    player.dy = -8;
                }
                continue;
            }
        }

        if (obs.x < -50) {
            obstacles.splice(i, 1);
            score += 1;
            scoreEl.textContent = score;
        }
    }

    for (let i = stars.length - 1; i >= 0; i--) {
        let st = stars[i];
        st.x -= gameSpeed;

        if (activePowerup === 'magnet' || feverTimer > 0) {
            const dx = (player.x + 24) - st.x;
            const dy = (player.y + 24) - st.y;
            if (Math.hypot(dx, dy) < 260) {
                st.x += dx * 0.12;
                st.y += dy * 0.12;
            }
        }

        ctx.font = '30px Arial';
        ctx.fillText('⭐', st.x - 15, st.y + 10);

        if (Math.hypot((player.x + 24) - st.x, (player.y + 24) - st.y) < 42) {
            playSound('star');
            score += 5;
            scoreEl.textContent = score;
            spawnParticles(st.x, st.y, '#FFCA3A', 8);
            stars.splice(i, 1);

            const newWorld = Math.floor(score / 50) % worlds.length;
            if (newWorld !== currentWorldIndex) {
                currentWorldIndex = newWorld;
                updateWorldUI();
                spawnParticles(canvas.width / 2, canvas.height / 2, '#FFFFFF', 25);
            }

            if (feverTimer <= 0) {
                feverMeter += 10;
                if (feverMeter >= 100) {
                    feverMeter = 0;
                    feverTimer = 300;
                    feverText.textContent = 'RAINBOW FEVER MODE!!';
                    playSound('powerup');
                }
                feverBar.style.width = `${feverMeter}%`;
            }
            continue;
        }

        if (st.x < -40) {
            stars.splice(i, 1);
        }
    }

    for (let i = eggs.length - 1; i >= 0; i--) {
        let egg = eggs[i];
        egg.x -= gameSpeed;
        const wobble = Math.sin(frameCount * 0.2) * 4;

        ctx.font = '34px Arial';
        ctx.fillText('🥚', egg.x - 15, egg.y + wobble);

        if (Math.hypot((player.x + 24) - egg.x, (player.y + 24) - egg.y) < 45) {
            activatePowerup();
            eggs.splice(i, 1);
            continue;
        }

        if (egg.x < -40) {
            eggs.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function gameLoop() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount++;

    if (invulnerableTimer > 0) {
        invulnerableTimer--;
    }

    if (feverTimer > 0) {
        feverTimer--;
        feverBar.style.width = `${(feverTimer / 300) * 100}%`;
        if (feverTimer <= 0) {
            feverText.textContent = 'Collect stars for Rainbow Fever!';
            feverBar.style.width = '0%';
        }
    }

    if (powerupTimer > 0) {
        powerupTimer--;
        if (powerupTimer <= 0) {
            activePowerup = null;
            powerupBanner.classList.add('hidden');
        }
    }

    if (frameCount % 360 === 0 && gameSpeed < 9.5) {
        gameSpeed += 0.35;
    }

    const currentGravity = worlds[currentWorldIndex].gravity;
    player.dy += currentGravity;
    player.y += player.dy;

    if (player.y >= groundY - player.size) {
        player.y = groundY - player.size;
        player.dy = 0;
        player.jumpsLeft = (activePowerup === 'wings' || feverTimer > 0) ? 2 : 1;
    }

    drawEnvironment();
    updateEntities();
    drawPlayer();

    requestAnimationFrame(gameLoop);
}

function endGame() {
    isPlaying = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('wonderDashHigh', highScore);
        highScoreEl.textContent = highScore;
    }

    overlayTitle.textContent = 'Amazing Run!';
    overlaySubtitle.textContent = `You scored ${score} stars across the Wonder Worlds!`;
    startBtn.textContent = 'PLAY AGAIN';
    overlay.classList.remove('hidden');

    saveScoreToPHP(playerNameSelect.value, score);
}

async function saveScoreToPHP(name, finalScore) {
    if (finalScore <= 0) return;
    try {
        const res = await fetch('leaderboard.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, score: finalScore })
        });
        const topScores = await res.json();
        renderLeaderboard(topScores);
    } catch (e) {
        console.log('Running in local mode without PHP server.');
    }
}

async function loadLeaderboard() {
    try {
        const res = await fetch('leaderboard.php');
        const topScores = await res.json();
        renderLeaderboard(topScores);
    } catch (e) {
        leaderboardList.innerHTML = '<li>Run on PHP server for global scores!</li>';
    }
}

function renderLeaderboard(scores) {
    if (!scores || !scores.length) {
        leaderboardList.innerHTML = '<li>Be the first champion!</li>';
        return;
    }
    leaderboardList.innerHTML = scores
        .map((s, i) => `<li>#${i + 1} ${s.name}: ${s.score}</li>`)
        .join('');
}

drawEnvironment();
drawPlayer();
loadLeaderboard();
