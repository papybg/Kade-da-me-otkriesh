// --- ДЕФИНИРАНЕ НА ЕЛЕМЕНТИТЕ ---
const welcomeScreenEl = document.getElementById('welcomeScreen');
const enterGameBtn = document.getElementById('enterGameBtn');
const startScreenEl = document.getElementById('startScreen');
const portalContainerEl = document.getElementById('portalContainer');
const gameScreenEl = document.getElementById('gameScreen');
const gameBoardEl = document.getElementById('gameBoard');
const choiceZoneEl = document.getElementById('choiceZone');
const gameMessageEl = document.getElementById('gameMessage');
const gameTitleEl = document.getElementById('gameTitle');
const winScreenEl = document.getElementById('winScreen');
const winMessageEl = document.getElementById('winMessage');
const playAgainBtn = document.getElementById('playAgainBtn');
const startTurnBtn = document.getElementById('startTurnBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const feedbackMessageEl = document.getElementById('feedbackMessage');
const winScreenMenuBtn = document.getElementById('winScreenMenuBtn');
const geminiModal = document.getElementById('gemini-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalContinueBtn = document.getElementById('modal-continue-btn');
const modalLoader = document.getElementById('modal-loader');
const modalText = document.getElementById('modal-text');

// --- АУДИО СИСТЕМА ---
let bravoSound, opitaiPakSound;
let audioInitialized = false;

function initializeAudio() {
    if (audioInitialized || typeof Tone === 'undefined') return;
    try {
        Tone.start();
        bravoSound = new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination();
        opitaiPakSound = new Tone.Synth({ oscillator: { type: 'square' } }).toDestination();
        audioInitialized = true;
    } catch (e) {
        console.error("Грешка при инициализиране на аудиото:", e);
    }
}

// --- ПРОМЕНЛИВИ ЗА СЪСТОЯНИЕТО ---
let allItems = [];
let portalsData = [];
let layoutsData = {};
let currentPortalData = {}, currentLayoutId = null;
let isTurnActive = false, availableSlots = [], activeSlotData = null, totalSlots = 0;

// --- Функция за зареждане на всички данни от файлове ---
async function loadAllData() {
    try {
        const [portalsRes, itemsRes, layoutD1Res] = await Promise.all([
            fetch('main/portals.json'),
            fetch('main/themes.json'),
            fetch('main/assets/layouts/d1.json') 
        ]);

        const portalsJson = await portalsRes.json();
        const itemsJson = await itemsRes.json();
        const layoutD1Json = await layoutD1Res.json();

        portalsData = portalsJson.portals;
        allItems = itemsJson.allItems;
        layoutsData['d1'] = layoutD1Json;

        console.log("Всички данни са заредени успешно!");

    } catch (error) {
        console.error("Критична грешка при зареждане на данните за играта:", error);
        document.body.innerHTML = '<h1>Грешка при зареждане на играта. Моля, опитайте по-късно.</h1>';
    }
}

// --- Инициализация ---
async function initializeApp() {
    await loadAllData();
    renderPortals(portalsData);
    setupEventListeners();
}

// --- РЕНДИРАНЕ НА ПОРТАЛИТЕ ---
function renderPortals(portals) {
    portalContainerEl.innerHTML = '';
    portals.forEach(portal => {
        const portalEl = document.createElement('div');
        portalEl.className = 'portal';
        portalEl.innerHTML = `<img src="${portal.icon}" alt="${portal.name}"><div class="portal-name">${portal.name}</div>`;
        portalEl.addEventListener('click', () => startGame(portal));
        portalContainerEl.appendChild(portalEl);
    });
}

// --- СТАРТИРАНЕ НА ИГРАТА ---
function startGame(portal) {
    currentPortalData = portal;
    startScreenEl.classList.add('hidden');
    gameScreenEl.classList.remove('hidden');
    gameScreenEl.classList.add('visible');
    gameTitleEl.textContent = portal.name;
    currentLayoutId = portal.layouts[0];
    loadLayout(currentLayoutId);
}

// --- ЗАРЕЖДАНЕ НА КОНКРЕТНО НИВО ---
function loadLayout(layoutId) {
    winScreenEl.classList.add('hidden');
    const levelData = layoutsData[layoutId];
    if (!levelData) { console.error(`Нивото ${layoutId} не бе намерено`); return; }
    
    resetGameState();
    
    const isMobile = window.innerWidth < 768;
    const backgroundUrl = isMobile ? levelData.background_small : levelData.background_large;
    gameBoardEl.style.backgroundImage = `url('${backgroundUrl}')`;

    availableSlots = JSON.parse(JSON.stringify(levelData.slots));
    totalSlots = availableSlots.length;
    createSlots(availableSlots);
    const choicePool = generateChoicePool(levelData);
    renderChoiceZone(choicePool);
    gameMessageEl.textContent = "Натисни СТАРТ за да започнеш!";
    startTurnBtn.classList.remove('hidden');
}

// --- ГЕНЕРИРАНЕ НА ИЗБОРИТЕ ---
function generateChoicePool(levelData) {
    const correctItems = new Map();
    levelData.slots.forEach(slot => {
        const possibleItems = allItems.filter(item => slot.index.includes(item.index));
        if (possibleItems.length > 0) {
            const randomItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
            if (!correctItems.has(randomItem.id)) correctItems.set(randomItem.id, randomItem);
        }
    });
    const correctItemsArray = Array.from(correctItems.values());
    const distractorCount = 8 - correctItemsArray.length;
    const possibleDistractors = allItems.filter(item => !correctItems.has(item.id));
    const shuffledDistractors = shuffleArray(possibleDistractors).slice(0, Math.max(0, distractorCount));
    return shuffleArray([...correctItemsArray, ...shuffledDistractors]);
}

// --- РЕНДИРАНЕ НА ЗОНА ЗА ИЗБОР ---
function renderChoiceZone(choicePool) {
    choiceZoneEl.innerHTML = '';
    choicePool.forEach(item => {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.classList.add('choice-item');
        img.addEventListener('click', () => handleChoiceClick(item, img));
        choiceZoneEl.appendChild(img);
    });
}

// --- СЪЗДАВАНЕ НА СЛОТОВЕТЕ ---
function createSlots(slots) {
    const dropZone = document.getElementById('dropZone');
    dropZone.innerHTML = '<div id="feedbackMessage"></div>';
    slots.forEach((slot, index) => {
        const slotEl = document.createElement('div');
        slotEl.className = 'slot';
        slotEl.style.width = slot.diameter;
        slotEl.style.height = slot.diameter;
        slotEl.style.top = slot.position.top;
        slotEl.style.left = slot.position.left;
        slotEl.dataset.originalIndex = index;
        dropZone.appendChild(slotEl);
    });
}

// --- СТАРТИРАНЕ НА ХОД ---
function startNewTurn() {
    isTurnActive = true;
    startTurnBtn.classList.add('hidden');
    activateNextSlot();
}

// --- АКТИВИРАНЕ НА СЛЕДВАЩ ПРОИЗВОЛЕН СЛОТ ---
function activateNextSlot() {
    if (activeSlotData) {
        const prevSlot = document.querySelector(`.slot[data-original-index="${activeSlotData.originalIndex}"]`);
        if (prevSlot) prevSlot.classList.remove('active');
    }

    if (availableSlots.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSlots.length);
        const randomSlotData = availableSlots[randomIndex];
        
        const originalSlotIndex = layoutsData[currentLayoutId].slots.findIndex(s => s === randomSlotData);
        
        activeSlotData = { ...randomSlotData, originalIndex: originalSlotIndex };
        
        const activeSlotEl = document.querySelector(`.slot[data-original-index="${activeSlotData.originalIndex}"]`);
        if (activeSlotEl) {
            activeSlotEl.classList.add('active');
            gameMessageEl.textContent = `Какво ще има тук?`;
        }
    } else {
        showFeedback(true, "БРАВО!");
        if(bravoSound) bravoSound.triggerAttackRelease("C5", "0.5s");
        setTimeout(() => {
            winMessageEl.textContent = "БРАВО, ДА ОПИТАМЕ ПАК!";
            winScreenEl.classList.remove('hidden');
        }, 1500);
        activeSlotData = null;
    }
}

// --- ОБРАБОТКА НА ИЗБОРА ---
function handleChoiceClick(chosenItem, chosenImgElement) {
    if (!isTurnActive || !activeSlotData || chosenImgElement.classList.contains('used')) return;

    const isValid = activeSlotData.index.includes(chosenItem.index);
    
    if (isValid) {
        showFeedback(true, "Браво!");
        if(bravoSound) bravoSound.triggerAttackRelease("C5", "0.5s");
        
        placeImageInSlot(chosenItem, activeSlotData);
        chosenImgElement.classList.add('used');
        
        availableSlots = availableSlots.filter(slot => slot !== layoutsData[currentLayoutId].slots[activeSlotData.originalIndex]);

        setTimeout(activateNextSlot, 3000);
    } else {
        showFeedback(false, "Опитай пак!");
        if(opitaiPakSound) opitaiPakSound.triggerAttackRelease("C3", "0.5s");
        chosenImgElement.style.borderColor = 'red';
        setTimeout(() => { if (chosenImgElement) chosenImgElement.style.borderColor = 'white'; }, 500);
    }
}

// --- ПОКАЗВАНЕ НА ОБРАТНА ВРЪЗКА ---
function showFeedback(isCorrect, message) {
    const feedbackEl = document.getElementById('feedbackMessage');
    feedbackEl.textContent = message;
    feedbackEl.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
    feedbackEl.classList.add('show');
    setTimeout(() => { feedbackEl.classList.remove('show'); }, 1500);
}

// --- ПОСТАВЯНЕ НА КАРТИНКА В СЛОТ ---
function placeImageInSlot(item, slotData) {
    const container = document.createElement('div');
    container.className = 'placed-image-container';
    container.style.width = slotData.diameter;
    container.style.height = slotData.diameter;
    container.style.top = slotData.position.top;
    container.style.left = slotData.position.left;
    
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    img.classList.add('placed-image');
    
    const btn = document.createElement('button');
    btn.className = 'fun-fact-btn';
    btn.innerHTML = '✨';
    btn.onclick = () => getFunFact(item);
    
    container.appendChild(img);
    container.appendChild(btn);
    document.getElementById('dropZone').appendChild(container);
}

// --- GEMINI API ИНТЕГРАЦИЯ (празна за момента) ---
async function getFunFact(item) {
    console.log("Fun fact for:", item.name);
}

// --- НУЛИРАНЕ НА СЪСТОЯНИЕТО НА ИГРАТА ---
function resetGameState() {
    isTurnActive = false;
    availableSlots = [];
    activeSlotData = null;
    totalSlots = 0;
    winScreenEl.classList.add('hidden');
    startTurnBtn.classList.remove('hidden');
}

// --- ВРЪЩАНЕ В ГЛАВНОТО МЕНЮ ---
function showMenu() {
    gameScreenEl.classList.remove('visible');
    gameScreenEl.classList.add('hidden');
    winScreenEl.classList.add('hidden');
    startScreenEl.classList.remove('hidden');
    startScreenEl.classList.add('visible');
}

// --- УПРАВЛЕНИЕ НА ЦЯЛ ЕКРАН ---
function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) { elem.requestFullscreen(); } 
    else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(); } 
    else if (elem.msRequestFullscreen) { elem.msRequestFullscreen(); }
}

// --- НАСТРОЙКА НА СЛУШАТЕЛИТЕ ---
function setupEventListeners() {
    enterGameBtn.addEventListener('click', () => {
        initializeAudio();
        // enterFullscreen();
        welcomeScreenEl.classList.add('hidden');
        startScreenEl.classList.remove('hidden');
        startScreenEl.classList.add('visible');
    });
    startTurnBtn.addEventListener('click', startNewTurn);
    playAgainBtn.addEventListener('click', () => loadLayout(currentLayoutId));
    backToMenuBtn.addEventListener('click', showMenu);
    winScreenMenuBtn.addEventListener('click', showMenu);
    const closeModal = () => { geminiModal.classList.add('hidden'); };
    modalCloseBtn.addEventListener('click', closeModal);
    modalContinueBtn.addEventListener('click', closeModal);
}

// --- ПОМОЩНИ ФУНКЦИИ ---
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// --- СТАРТИРАНЕ НА ПРИЛОЖЕНИЕТО ---
initializeApp();
