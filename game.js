// Configuración del juego
const CONFIG = {
    gameDuration: 60000, // 60 segundos en ms
    basketWidth: 90,
    basketHeight: 50,
    objectTypes: {
        babero: { points: 10, speed: 1.5, weight: 0.4, color: '#ff8a80', label: 'Babero' },
        chupete: { points: 15, speed: 1.3, weight: 0.25, color: '#66bb6a', label: 'Chupete' },
        biberon: { points: 20, speed: 1.1, weight: 0.2, color: '#81d4fa', label: 'Biberón' },
        caca: { points: -15, speed: 1.8, weight: 0.1, color: '#795548', label: 'Caca' },
        caja: { points: -30, speed: 1.0, weight: 0.05, color: '#78909c', label: 'Caja' }
    },
    levelObjectives: [10, 15, 20, 25],
    maxObjects: 8,
    spawnRate: 800, // ms entre apariciones
    baseSpeed: 1.5,
    speedIncrement: 0.1
};

// Mezcla de pesos para objetos negativos según nivel
function getNegativeObjectWeights(level) {
    const baseCacaWeight = 0.08;
    const baseCajaWeight = 0.03;
    const increaseFactor = Math.min(1 + level * 0.2, 2);
    return {
        caca: baseCacaWeight * increaseFactor,
        caja: baseCajaWeight * increaseFactor
    };
}

// Estado del juego
let gameState = {
    screen: 'start', // 'start', 'playing', 'result'
    score: 0,
    timeRemaining: 60000,
    level: 1,
    levelProgress: 0,
    levelObjective: 10,
    objects: [],
    caughtBaberos: 0,
    caughtChupetes: 0,
    caughtBiberones: 0,
    caughtCacas: 0,
    caughtCajas: 0,
    soundsEnabled: true,
    soundsInitialized: false,
    animationId: null,
    lastTimestamp: 0,
    gameStartTime: 0,
    lastSpawnTime: 0,
    currentObjectsCount: 0,
    basketX: 0,
    basketY: 0,
    basketWidth: CONFIG.basketWidth,
    basketHeight: CONFIG.basketHeight,
    canvasWidth: 0,
    canvasHeight: 0,
    touchX: null,
    isTouching: false,
    mouseX: null,
    particles: [],
    levelUpParticles: [],
    isPaused: false,
    pausedTime: 0,
    totalPauseDuration: 0,
    lastFrameTime: 0,
    deltaTime: 0
};

// Elementos del DOM
const screens = {
    start: document.getElementById('start-screen'),
    playing: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

const elements = {
    score: document.getElementById('score'),
    timer: document.getElementById('timer'),
    level: document.getElementById('level'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    objectiveCount: document.getElementById('objective-count'),
    objectiveTotal: document.getElementById('objective-total'),
    finalScore: document.getElementById('final-score'),
    finalLevel: document.getElementById('final-level'),
    finalBaberos: document.getElementById('final-baberos'),
    finalChupetes: document.getElementById('final-chupetes'),
    finalBiberones: document.getElementById('final-biberones'),
    finalCacas: document.getElementById('final-cacas'),
    finalCajas: document.getElementById('final-cajas'),
    soundBtn: document.getElementById('sound-btn'),
    soundIcon: document.getElementById('sound-icon'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn')
};

// Canvas
const gameCanvas = document.getElementById('game-canvas');
const gameCtx = gameCanvas.getContext('2d');
const illustrationCanvas = document.getElementById('illustration-canvas');
const illustCtx = illustrationCanvas.getContext('2d');
const resultCanvas = document.getElementById('result-canvas');
const resultCtx = resultCanvas.getContext('2d');

// Audio (Web Audio API para sonidos generados)
let audioContext = null;

// Inicializar canvas
function initCanvas() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (gameCanvas) {
        const rect = gameCanvas.parentElement.getBoundingClientRect();
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
        gameState.canvasWidth = gameCanvas.width;
        gameState.canvasHeight = gameCanvas.height;
        gameState.basketX = (gameCanvas.width - gameState.basketWidth) / 2;
        gameState.basketY = gameCanvas.height - gameState.basketHeight - 30;
    }
}

// Inicializar ilustración de inicio
function initIllustration() {
    const canvas = illustrationCanvas;
    const ctx = illustCtx;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = 300 * dpr;
    canvas.height = 300 * dpr;
    canvas.style.width = '300px';
    canvas.style.height = '300px';
    ctx.scale(dpr, dpr);
    
    drawIllustration(canvas.width / dpr, canvas.height / dpr, ctx);
}

function drawIllustration(width, height, ctx) {
    // Fondo pastel
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ffcdd2');
    gradient.addColorStop(0.5, '#fff9c4');
    gradient.addColorStop(1, '#b3e5fc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Nubes decorativas
    drawCloud(ctx, 40, 30, 40, 'rgba(255, 255, 255, 0.8)');
    drawCloud(ctx, width - 60, 50, 35, 'rgba(255, 255, 255, 0.7)');
    drawCloud(ctx, width/2 - 30, height - 40, 45, 'rgba(255, 255, 255, 0.6)');
    
    // Estrellas decorativas
    drawStar(ctx, 60, 120, 5, 15, 'rgba(255, 183, 77, 0.7)');
    drawStar(ctx, width - 50, 180, 5, 12, 'rgba(179, 238, 255, 0.7)');
    
    // Canastita
    drawBasket(ctx, width/2 - 30, height - 90, 60, 40);
    
    // Babero
    drawBabero(ctx, width/2 - 25, 80, 20);
    
    // Chupete
    drawChupete(ctx, width/2 + 25, 100, 18);
    
    // Biberón
    drawBiberon(ctx, width/2 + 60, 60, 22);
    
    // Caca
    drawPoop(ctx, width/2 - 50, 140, 15);
    
    // Caja
    drawBox(ctx, width/2 + 80, 120, 20);
    
    // Flecha indicando dirección
    ctx.save();
    ctx.strokeStyle = '#ff6b8a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width/2, height - 130);
    ctx.lineTo(width/2, height - 170);
    ctx.stroke();
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath();
    ctx.moveTo(width/2, height - 165);
    ctx.lineTo(width/2 - 8, height - 180);
    ctx.lineTo(width/2 + 8, height - 180);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawCloud(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size/3, 0, Math.PI * 2);
    ctx.arc(x - size/4, y + size/6, size/4, 0, Math.PI * 2);
    ctx.arc(x + size/4, y + size/6, size/4, 0, Math.PI * 2);
    ctx.arc(x, y + size/3, size/3, 0, Math.PI * 2);
    ctx.fill();
}

function drawStar(ctx, x, y, points, outerR, color) {
    const innerR = outerR / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI / points) - Math.PI / 2;
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
}

function drawBasket(ctx, x, y, w, h) {
    ctx.save();
    // Cuerpo de la canasta
    ctx.fillStyle = '#ffb74d';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + 5, y + h - 10);
    ctx.quadraticCurveTo(x + w/2, y - 10, x + w - 5, y + h - 10);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    
    // Bordes
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Rayitas decorativas
    ctx.strokeStyle = '#ffe0b2';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const lx = x + 10 + i * 15;
        ctx.beginPath();
        ctx.moveTo(lx, y + h - 15);
        ctx.quadraticCurveTo(lx + 5, y + h - 25, lx + 10, y + h - 15);
        ctx.stroke();
    }
    
    // Hilo decorativo
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y - 5, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Dibujar objetos
function drawBabero(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    // Mangas
    ctx.fillStyle = '#ff8a80';
    ctx.beginPath();
    ctx.ellipse(-size * 0.5, 0, size * 0.3, size * 0.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(size * 0.5, 0, size * 0.3, size * 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Cuerpo
    ctx.fillStyle = '#ef9a9a';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.2, size * 0.4, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rollo
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Anillo del rollo
    ctx.strokeStyle = '#ff8a80';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

function drawChupete(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    // Dedo
    ctx.fillStyle = '#ef9a9a';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.3, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cuerda
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(0, -size);
    ctx.stroke();
    
    // Nudo
    ctx.fillStyle = '#ff8a80';
    ctx.beginPath();
    ctx.arc(0, -size * 0.7, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Anillo
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -size, size * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

function drawBiberon(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    // Cuerpo
    ctx.fillStyle = '#81d4fa';
    ctx.beginPath();
    ctx.roundRect(-size * 0.6, -size * 0.3, size * 1.2, size * 0.8, size * 0.15);
    ctx.fill();
    
    // Cuello
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(-size * 0.3, -size * 0.5, size * 0.6, size * 0.3, size * 0.1);
    ctx.fill();
    
    // Tapa
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.roundRect(-size * 0.35, -size * 0.65, size * 0.7, size * 0.2, size * 0.1);
    ctx.fill();
    
    // Opciones de biberón (si mide)
    if (size > 18) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, size * 0.1);
        ctx.lineTo(size * 0.2, size * 0.1);
        ctx.stroke();
    }
    
    ctx.restore();
}

function drawPoop(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    // Caca principal
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.4, size * 0.3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Trocitos
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.arc(size * 0.3, -size * 0.2, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-size * 0.25, size * 0.15, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.1, size * 0.25, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Brillo
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.1, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawBox(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    // Caja
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.roundRect(-size/2, -size/2, size, size, size * 0.08);
    ctx.fill();
    
    // Solapas
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(-size * 0.05, -size * 0.4, size * 0.1, size * 0.8);
    ctx.fillRect(size * 0.05, -size * 0.4, size * 0.1, size * 0.8);
    
    // Etiqueta
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.4, size * 0.05);
    ctx.fill();
    
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1;
    ctx.strokeRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.4);
    
    ctx.restore();
}

// Sistema de audio
function initAudio() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Audio no disponible');
    }
}

function playSound(type) {
    if (!gameState.soundsEnabled || !audioContext) return;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    
    switch(type) {
        case 'positive': // Atrapar objeto positivo
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        case 'negative': // Atrapar objeto negativo
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'levelUp': // Subir de nivel
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'gameOver': // Fin de juego
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'box': // Caja
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
    }
}

// Controladores de teclado
function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (gameState.screen !== 'playing') return;
        
        const speed = 8;
        switch(e.key) {
            case 'ArrowLeft':
            case 'a':
                gameState.basketX = Math.max(0, gameState.basketX - speed);
                e.preventDefault();
                break;
            case 'ArrowRight':
            case 'd':
                gameState.basketX = Math.min(gameState.canvasWidth - gameState.basketWidth, gameState.basketX + speed);
                e.preventDefault();
                break;
        }
    });
}

// Controladores de ratón
function setupMouseControls() {
    gameCanvas.addEventListener('mousemove', (e) => {
        if (gameState.screen !== 'playing') return;
        const rect = gameCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        gameState.basketX = Math.max(0, Math.min(gameState.canvasWidth - gameState.basketWidth, mouseX - gameState.basketWidth/2));
    });
}

// Controladores táctiles
function setupTouchControls() {
    gameCanvas.addEventListener('touchstart', handleTouch, { passive: false });
    gameCanvas.addEventListener('touchmove', handleTouch, { passive: false });
    gameCanvas.addEventListener('touchend', (e) => {
        gameState.isTouching = false;
        gameState.touchX = null;
    });
}

function handleTouch(e) {
    e.preventDefault();
    if (gameState.screen !== 'playing') return;
    
    const rect = gameCanvas.getBoundingClientRect();
    let touchX;
    
    if (e.touches.length > 0) {
        touchX = e.touches[0].clientX - rect.left;
    }
    
    if (e.type === 'touchstart') {
        gameState.isTouching = true;
        gameState.touchX = touchX;
    }
    
    if (gameState.isTouching && gameState.touchX !== null) {
        const diff = touchX - gameState.touchX;
        gameState.basketX = Math.max(0, Math.min(gameState.canvasWidth - gameState.basketWidth, gameState.basketX + diff));
        gameState.touchX = touchX;
    }
}

// Generar objetos
function spawnObject() {
    // Determinar el tipo de objeto basado en pesos y nivel
    const weights = getNegativeObjectWeights(gameState.level);
    
    // Calcular el próximo nivel objetivo
    const maxLevelIndex = CONFIG.levelObjectives.length - 1;
    const currentLevelIndex = Math.min(gameState.level - 1, maxLevelIndex);
    const baseObjective = CONFIG.levelObjectives[currentLevelIndex];
    
    // Para niveles más altos, incrementar el objetivo progresivamente
    const levelProgress = Math.max(0, gameState.level - 5);
    const extraPerLevel = 5;
    const finalObjective = baseObjective + (levelProgress * extraPerLevel);
    
    // Actualizar el objetivo si ha cambiado
    if (finalObjective !== gameState.levelObjective) {
        gameState.levelObjective = finalObjective;
    }
    
    // Peso total para objeto positivo
    let totalPositiveWeight = 0;
    for (const [type, config] of Object.entries(CONFIG.objectTypes)) {
        if (type !== 'caca' && type !== 'caja') {
            totalPositiveWeight += config.weight;
        }
    }
    
    // Ajustar frecuencia de objetos negativos según nivel
    const negativeFactor = Math.min(1 + gameState.level * 0.15, 1.5);
    const cumulative = Math.random() * (totalPositiveWeight * negativeFactor + weights.caca + weights.caja);
    
    let cumulativeWeight = 0;
    let chosenType = 'babero';
    
    // Generar objetos positivos
    for (const type of ['babero', 'chupete', 'biberon']) {
        if (type === 'babero') cumulativeWeight += CONFIG.objectTypes[type].weight * negativeFactor;
        else if (type === 'chupete') cumulativeWeight += CONFIG.objectTypes[type].weight * negativeFactor;
        else if (type === 'biberon') cumulativeWeight += CONFIG.objectTypes[type].weight * negativeFactor;
        
        if (cumulative <= cumulativeWeight) {
            chosenType = type;
            break;
        }
    }
    
    // Generar objetos negativos
    if (chosenType === 'babero') {
        cumulativeWeight = 0;
        for (const type of ['babero', 'chupete', 'biberon']) {
            cumulativeWeight += CONFIG.objectTypes[type].weight * negativeFactor;
        }
        cumulative += cumulativeWeight;
        
        if (cumulative <= cumulativeWeight + weights.caca) {
            chosenType = 'caca';
        } else if (cumulative <= cumulativeWeight + weights.caca + weights.caja) {
            chosenType = 'caja';
        }
    }
    
    // Determinar velocidad con variación aleatoria
    const baseSpeed = CONFIG.baseSpeed + (gameState.level - 1) * CONFIG.speedIncrement;
    const speedVariation = 0.8 + Math.random() * 0.4;
    const speed = baseSpeed * speedVariation * (chosenType === 'caja' ? 0.9 : chosenType === 'caca' ? 1.1 : 1);
    
    // Generar posición inicial aleatoria
    const x = Math.random() * (gameState.canvasWidth - 30) + 15;
    const size = chosenType === 'babero' ? 25 : chosenType === 'chupete' ? 22 : chosenType === 'biberon' ? 28 : chosenType === 'caca' ? 20 : 24;
    
    const newObject = {
        x: x,
        y: -size - 10,
        size: size,
        type: chosenType,
        speed: speed,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() * 0.05 - 0.025) * (chosenType === 'caja' ? 1 : 0.5),
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 2 + Math.random() * 2,
        bobAmount: 1 + Math.random() * 2,
        opacity: 1
    };
    
    gameState.objects.push(newObject);
    gameState.currentObjectsCount++;
}

// Actualizar objetos
function updateObjects(deltaTime) {
    const objectsToRemove = [];
    
    for (let i = 0; i < gameState.objects.length; i++) {
        const obj = gameState.objects[i];
        
        // Verificar colisión con canasta
        if (checkCollision(obj, gameState.basketX, gameState.basketY, gameState.basketWidth, gameState.basketHeight)) {
            handleObjectCaught(obj);
            objectsToRemove.push(i);
            continue;
        }
        
        // Mover objeto
        obj.y += obj.speed * (deltaTime / 16); // Escalar por deltaTime
        obj.rotation += obj.rotationSpeed * (deltaTime / 16);
        obj.bobPhase += obj.bobSpeed * (deltaTime / 16);
        
        // Verificar si el objeto se salió de la pantalla
        if (obj.y > gameState.canvasHeight + obj.size) {
            objectsToRemove.push(i);
        }
    }
    
    // Eliminar objetos procesados (en orden inverso para no afectar índices)
    for (let i = objectsToRemove.length - 1; i >= 0; i--) {
        gameState.objects.splice(objectsToRemove[i], 1);
        gameState.currentObjectsCount--;
    }
}

// Verificar colisión
function checkCollision(obj, basketX, basketY, basketW, basketH) {
    // Bounding box de la canasta (rectángulo)
    const basketLeft = basketX + 5;
    const basketRight = basketX + basketW - 5;
    const basketTop = basketY + 5;
    const basketBottom = basketY + basketH - 5;
    
    // Bounding box del objeto
    const objLeft = obj.x - obj.size * 0.4;
    const objRight = obj.x + obj.size * 0.4;
    const objTop = obj.y - obj.size * 0.4;
    const objBottom = obj.y + obj.size * 0.4;
    
    // Verificar intersección
    return objLeft < basketRight && objRight > basketLeft &&
           objTop < basketBottom && objBottom > basketTop;
}

// Manejar objeto atrapado
function handleObjectCaught(obj) {
    const type = obj.type;
    let points = 0;
    
    switch(type) {
        case 'babero':
            points = 10;
            gameState.caughtBaberos++;
            break;
        case 'chupete':
            points = 15;
            gameState.caughtChupetes++;
            break;
        case 'biberon':
            points = 20;
            gameState.caughtBiberones++;
            break;
        case 'caca':
            points = -15;
            gameState.caughtCacas++;
            break;
        case 'caja':
            points = -30;
            gameState.caughtCajas++;
            break;
    }
    
    // Actualizar puntaje (mínimo 0)
    if (points > 0) {
        gameState.score += points;
        gameState.levelProgress++;
        
        // Verificar si completó el objetivo
        if (gameState.levelProgress >= gameState.levelObjective) {
            completeLevel();
        }
        
        // Efecto visual de puntos
        spawnPointsEffect(obj.x, obj.y, `+${points}`, '#388e3c');
    } else {
        // No permitir puntaje negativo
        gameState.score = Math.max(0, gameState.score + points);
        spawnPointsEffect(obj.x, obj.y, `${points}`, '#c62828');
    }
    
    // Reproducir sonido
    playSound(points > 0 ? 'positive' : (type === 'caja' ? 'box' : 'negative'));
    
    // Partículas de celebración para objetos positivos
    if (points > 0) {
        spawnParticles(obj.x, obj.y, obj.type === 'chupete' ? '#66bb6a' : obj.type === 'biberon' ? '#81d4fa' : '#ff8a80', 15);
    }
}

// Completar nivel
function completeLevel() {
    gameState.level++;
    gameState.levelProgress = 0;
    
    // Calcular nuevo objetivo
    const maxLevelIndex = CONFIG.levelObjectives.length - 1;
    const currentLevelIndex = Math.min(gameState.level - 1, maxLevelIndex);
    const baseObjective = CONFIG.levelObjectives[currentLevelIndex];
    const levelProgress = Math.max(0, gameState.level - 5);
    const extraPerLevel = 5;
    gameState.levelObjective = baseObjective + (levelProgress * extraPerLevel);
    
    // Efecto de subir de nivel
    playSound('levelUp');
    spawnParticles(gameState.canvasWidth/2, gameState.canvasHeight/2, '#ff6b8a', 30);
    
    // Limitar objetos simultáneos
    const maxObjectsForLevel = Math.min(CONFIG.maxObjects + Math.floor(gameState.level / 2), 15);
    const targetObjects = Math.min(maxObjectsForLevel, Math.ceil(maxObjectsForLevel * 0.7));
    
    // Aumentar spawn rate ligeramente
    const spawnRate = Math.max(400, CONFIG.spawnRate - (gameState.level - 1) * 30);
    
    // Mover canasta para efecto visual
    gameState.basketY -= 20;
    setTimeout(() => {
        gameState.basketY = gameState.canvasHeight - gameState.basketHeight - 30;
    }, 300);
}

// Efectos visuales
function spawnPointsEffect(x, y, text, color) {
    gameState.particles.push({
        type: 'text',
        text: text,
        x: x,
        y: y,
        color: color,
        alpha: 1,
        vy: -2,
        life: 1
    });
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        gameState.particles.push({
            type: 'particle',
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 3 + Math.random() * 5,
            color: color,
            alpha: 1,
            life: 1,
            gravity: 0.2
        });
    }
}

// Actualizar partículas
function updateParticles(deltaTime) {
    const dt = deltaTime / 16;
    
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.life -= dt * 0.02;
        
        if (p.type === 'text') {
            p.y += p.vy * dt;
            p.alpha -= dt * 0.015;
        } else {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.alpha = p.life;
        }
        
        if (p.life <= 0 || p.alpha <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

// Renderizar
function render() {
    const ctx = gameCtx;
    const W = gameState.canvasWidth;
    const H = gameState.canvasHeight;
    
    // Limpiar
    ctx.clearRect(0, 0, W, H);
    
    // Fondo
    const bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    bgGradient.addColorStop(0, '#b3e5fc');
    bgGradient.addColorStop(0.5, '#fff9c4');
    bgGradient.addColorStop(1, '#ffccd4');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);
    
    // Decoraciones
    drawBalls(ctx, W, H);
    drawStars(ctx, W, H);
    drawFloor(ctx, W, H);
    
    // Dibujar objetos
    for (const obj of gameState.objects) {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.rotation);
        ctx.globalAlpha = obj.opacity;
        
        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, obj.size * 0.5, obj.size * 0.4, obj.size * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Objeto
        ctx.translate(0, -obj.size * 0.5);
        ctx.translate(0, Math.sin(obj.bobPhase) * obj.bobAmount);
        
        switch(obj.type) {
            case 'babero':
                drawBabero(ctx, 0, 0, obj.size);
                break;
            case 'chupete':
                drawChupete(ctx, 0, 0, obj.size);
                break;
            case 'biberon':
                drawBiberon(ctx, 0, 0, obj.size);
                break;
            case 'caca':
                drawPoop(ctx, 0, 0, obj.size);
                break;
            case 'caja':
                drawBox(ctx, 0, 0, obj.size);
                break;
        }
        
        ctx.restore();
    }
    
    // Dibujar canasta
    drawBasket(ctx, gameState.basketX, gameState.basketY, gameState.basketWidth, gameState.basketHeight);
    
    // Partículas
    for (const p of gameState.particles) {
        if (p.type === 'text') {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.font = 'bold 24px Nunito, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        } else {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// Decoraciones del fondo
function drawBalls(ctx, W, H) {
    ctx.fillStyle = 'rgba(255, 183, 77, 0.4)';
    ctx.beginPath();
    ctx.arc(W * 0.1, H * 0.1, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(129, 212, 250, 0.4)';
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.05, 25, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(200, 247, 220, 0.4)';
    ctx.beginPath();
    ctx.arc(W * 0.15, H * 0.85, 20, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(225, 190, 223, 0.4)';
    ctx.beginPath();
    ctx.arc(W * 0.9, H * 0.9, 28, 0, Math.PI * 2);
    ctx.fill();
}

function drawStars(ctx, W, H) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const stars = [
        {x: W * 0.08, y: H * 0.15},
        {x: W * 0.92, y: H * 0.12},
        {x: W * 0.05, y: H * 0.75},
        {x: W * 0.88, y: H * 0.8}
    ];
    
    for (const star of stars) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const r = i % 2 === 0 ? 8 : 4;
            const x = star.x + r * Math.cos(angle);
            const y = star.y + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

function drawFloor(ctx, W, H) {
    const floorY = H - 25;
    
    // Suelo
    ctx.fillStyle = 'rgba(255, 248, 225, 0.5)';
    ctx.fillRect(0, floorY, W, 25);
    
    // Líneas decorativas
    ctx.strokeStyle = 'rgba(255, 183, 77, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
        const y = floorY + 5 + Math.sin(x * 0.1) * 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 15, y - 3);
        ctx.stroke();
    }
}

// Bucle de juego
function gameLoop(timestamp) {
    if (gameState.screen !== 'playing' && gameState.screen !== 'result') {
        return;
    }
    
    if (!gameState.lastFrameTime) {
        gameState.lastFrameTime = timestamp;
    }
    
    const deltaTime = Math.min(timestamp - gameState.lastFrameTime, 50); // Limitar delta a 50ms
    gameState.lastFrameTime = timestamp;
    
    if (gameState.screen === 'playing') {
        // Calcular tiempo restante basado en timestamps reales
        const elapsed = timestamp - gameState.gameStartTime - gameState.totalPauseDuration;
        gameState.timeRemaining = Math.max(0, CONFIG.gameDuration - elapsed);
        
        // Actualizar UI
        updateUI();
        
        // Verificar fin del juego
        if (gameState.timeRemaining <= 0) {
            endGame();
            return;
        }
        
        // Spawn de objetos (usando spawnRate dinámico calcular en completeLevel)
        const dynamicSpawnRate = Math.max(400, CONFIG.spawnRate - (gameState.level - 1) * 30);
        if (timestamp - gameState.lastSpawnTime > dynamicSpawnRate) {
            const maxObjects = Math.min(
                CONFIG.maxObjects + Math.floor(gameState.level / 2),
                15
            );
            if (gameState.objects.length < maxObjects) {
                spawnObject();
                gameState.lastSpawnTime = timestamp;
            }
        }
        
        // Actualizar objetos
        updateObjects(deltaTime);
        
        // Actualizar partículas
        updateParticles(deltaTime);
    }
    
    // Renderizar siempre (incluyendo resultado)
    render();
    
    gameState.animationId = requestAnimationFrame(gameLoop);
}

// Actualizar UI
function updateUI() {
    elements.score.textContent = gameState.score;
    const seconds = Math.ceil(gameState.timeRemaining / 1000);
    elements.timer.textContent = seconds;
    elements.level.textContent = gameState.level;
    
    // Barra de progreso
    const progress = gameState.levelObjective > 0 ? 
        (gameState.levelProgress / gameState.levelObjective) * 100 : 0;
    elements.progressBar.style.width = `${Math.min(100, progress)}%`;
    
    // Texto de progreso
    elements.progressText.textContent = `Objetivo: ${gameState.levelProgress} / ${gameState.levelObjective}`;
    elements.objectiveCount.textContent = gameState.levelProgress;
    elements.objectiveTotal.textContent = gameState.levelObjective;
    
    // Cambiar color del tiempo cuando está bajo
    if (seconds <= 10) {
        elements.timer.style.color = '#c62828';
    } else {
        elements.timer.style.color = '#ff8a65';
    }
}

// Iniciar juego
function startGame() {
    // Inicializar audio después de interacción del usuario
    initAudio();
    
    // Resetear estado
    gameState.screen = 'playing';
    gameState.score = 0;
    gameState.timeRemaining = CONFIG.gameDuration;
    gameState.level = 1;
    gameState.levelProgress = 0;
    gameState.levelObjective = CONFIG.levelObjectives[0];
    gameState.objects = [];
    gameState.caughtBaberos = 0;
    gameState.caughtChupetes = 0;
    gameState.caughtBiberones = 0;
    gameState.caughtCacas = 0;
    gameState.caughtCajas = 0;
    gameState.particles = [];
    gameState.currentObjectsCount = 0;
    gameState.gameStartTime = performance.now();
    gameState.lastSpawnTime = gameState.gameStartTime;
    gameState.totalPauseDuration = 0;
    
    // Posicionar canasta
    gameState.basketX = (gameState.canvasWidth - gameState.basketWidth) / 2;
    gameState.basketY = gameState.canvasHeight - gameState.basketHeight - 30;
    
    // Cambiar pantalla
    switchScreen('playing');
    
    // Actualizar UI inicial
    updateUI();
    
    // Iniciar bucle de juego
    gameState.lastFrameTime = 0;
    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
    }
    gameState.animationId = requestAnimationFrame(gameLoop);
}

// Finalizar juego
function endGame() {
    gameState.screen = 'result';
    gameState.objects = [];
    
    // Reproducir sonido
    playSound('gameOver');
    
    // Mostrar resultados
    elements.finalScore.textContent = gameState.score;
    elements.finalLevel.textContent = gameState.level;
    elements.finalBaberos.textContent = gameState.caughtBaberos;
    elements.finalChupetes.textContent = gameState.caughtChupetes;
    elements.finalBiberones.textContent = gameState.caughtBiberones;
    elements.finalCacas.textContent = gameState.caughtCacas;
    elements.finalCajas.textContent = gameState.caughtCajas;
    
    // Dibujar ilustración de resultado
    drawResultIllustration();
    
    // Mover a pantalla de resultados
    switchScreen('result');
    
    gameState.animationId = requestAnimationFrame(gameLoop);
}

// Volver a jugar
function restartGame() {
    // Limpiar
    gameState.objects = [];
    gameState.particles = [];
    
    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
    }
    
    startGame();
}

// Cambiar de pantalla
function switchScreen(screenName) {
    // Ocultar todas las pantallas
    for (const screen of Object.values(screens)) {
        screen.classList.remove('active');
    }
    gameState.screen = screenName;
    
    // Mostrar la pantalla solicitada
    const targetScreen = screenName === 'start' ? screens.start : 
                        screenName === 'playing' ? screens.playing : 
                        screens.result;
    targetScreen.classList.add('active');
    
    // Ajustar canvas para pantalla de juego
    if (screenName === 'playing') {
        resizeCanvas();
    }
    
    // Ocultar cursor en pantalla de juego
    if (screenName === 'playing') {
        document.body.classList.add('touch-active');
    } else {
        document.body.classList.remove('touch-active');
    }
}

// Configuración de sonidos
function toggleSound() {
    gameState.soundsEnabled = !gameState.soundsEnabled;
    gameState.soundBtn = elements.soundBtn;
    elements.soundIcon.textContent = gameState.soundsEnabled ? '🔊' : '🔇';
    elements.soundBtn.setAttribute('aria-label', 
        gameState.soundsEnabled ? 'Desactivar sonidos' : 'Activar sonidos');
}

function drawResultIllustration() {
    const canvas = resultCanvas;
    const ctx = resultCtx;
    const dpr = window.devicePixelRatio || 1;
    const W = 250;
    const H = 250;
    
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '250px';
    canvas.style.height = '250px';
    ctx.scale(dpr, dpr);
    
    // Fondo
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#ffcdd2');
    gradient.addColorStop(0.5, '#fff9c4');
    gradient.addColorStop(1, '#b3e5fc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    
    // Estrellas de celebración
    const starColor = gameState.score >= 100 ? '#ffeb3b' : gameState.score >= 50 ? '#ffc107' : '#ff9800';
    for (let i = 0; i < 15; i++) {
        const x = 20 + Math.random() * (W - 40);
        const y = 20 + Math.random() * (H - 40);
        const size = 5 + Math.random() * 8;
        const alpha = 0.3 + Math.random() * 0.5;
        ctx.fillStyle = starColor;
        ctx.globalAlpha = alpha;
        drawStar(ctx, x, y, 5, size, starColor);
    }
    ctx.globalAlpha = 1;
    
    // Babero celebrando
    drawBabero(ctx, W/2, H/2 - 20, 30);
    
    // Chupete y biberón
    drawChupete(ctx, W/2 - 50, H/2 + 30, 20);
    drawBiberon(ctx, W/2 + 50, H/2 + 30, 22);
    
    // Bandera de celebración
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath();
    ctx.moveTo(W/2, 20);
    ctx.lineTo(W/2, 60);
    ctx.lineTo(W/2 + 25, 55);
    ctx.lineTo(W/2 + 25, 25);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.score >= 100 ? '¡Súper!' : gameState.score >= 50 ? '¡Bien!' : 'OK', W/2 + 12, 45);
}

// Inicialización
function init() {
    initCanvas();
    initIllustration();
    setupKeyboardControls();
    setupMouseControls();
    setupTouchControls();
    
    // Event listeners para botones
    elements.startBtn.addEventListener('click', () => {
        initAudio();
        startGame();
    });
    
    elements.restartBtn.addEventListener('click', restartGame);
    
    elements.soundBtn.addEventListener('click', toggleSound);
    
    // Mostrar pantalla de inicio
    switchScreen('start');
}

// Manejo de visibilidad de pestaña para pausar
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState.screen === 'playing') {
        gameState.isPaused = true;
        gameState.pausedTime = performance.now();
    } else if (!document.hidden && gameState.screen === 'playing' && gameState.isPaused) {
        gameState.isPaused = false;
        gameState.totalPauseDuration += performance.now() - gameState.pausedTime;
    }
});

// Manejo del ciclo de vida de la página
window.addEventListener('beforeunload', () => {
    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
    }
});

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
