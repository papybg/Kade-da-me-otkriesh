document.addEventListener('DOMContentLoaded', () => {
    // --- ЕЛЕМЕНТИ ---
    const bodyEl = document.body;
    const bravoAudio = document.getElementById('bravoAudio');
    const opitaiPakAudio = document.getElementById('opitaiPakAudio');
    const startScreenEl = document.getElementById('startScreen');
    const portalContainerEl = document.getElementById('portalContainer');
    const gameScreenEl = document.getElementById('gameScreen');
    const gameBoardEl = document.getElementById('gameBoard');
    const choiceZoneEl = document.getElementById('choiceZone');
    const gameMessageEl = document.getElementById('gameMessage');
    const gameTitleEl = document.getElementById('gameTitle');
    const winScreenEl = document.getElementById('winScreen');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const startTurnBtn = document.getElementById('startTurnBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn');

    // --- СЪСТОЯНИЕ ---
    let allItems = [];
    let currentPortalData = {};
    let currentLayoutId = null;
    let isTurnActive = false;
    let availableSlots = [];
    let activeSlotData = null;
    const repoName = "/Kade-da-me-otkriesh"; // Името на репозиторито

    async function initializeApp() {
        try {
            // Коригираме пътищата и тук
            const [themesResponse, portalsResponse] = await Promise.all([
                fetch(`${repoName}/themes.json`),
                fetch(`${repoName}/portals.json`)
            ]);
            if (!themesResponse.ok || !portalsResponse.ok) throw new Error('Config files not found');
            const themesData = await themesResponse.json();
            const portalsData = await portalsResponse.json();
            allItems = themesData.allItems;
            
            renderPortals(portalsData.portals);
            setupEventListeners();
            showStartScreen();
        } catch (error) { console.error("Initialization Error:", error); }
    }

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

    function startGame(portal) {
        currentPortalData = portal;
        showGameScreen();
        loadNextLayout();
    }

    async function loadLayout(layoutId) {
        try {
            // Коригираме пътя и тук
            const response = await fetch(`${repoName}/assets/layouts/${layoutId}.json`);
            if (!response.ok) throw new Error(`Layout file ${layoutId}.json not found`);
            const levelData = await response.json();
            currentLayoutId = layoutId;
            
            isTurnActive = false;
            winScreenEl.classList.add('hidden');
            startTurnBtn.classList.remove('hidden');
            gameMessageEl.textContent = 'Натисни "СТАРТ"!';
            gameBoardEl.style.backgroundImage = `url('${currentPortalData.background}')`; 
            gameTitleEl.textContent = currentPortalData.name;
            gameBoardEl.innerHTML = '<div id="slotHighlighter" class="hidden"></div>'; 
            
            availableSlots = [...levelData.slots];
            const choicePool = generateChoicePool(levelData);
            renderChoiceZone(choicePool);
        } catch(error) { console.error(`Error loading layout ${layoutId}.json:`, error); }
    }

    function generateChoicePool(levelData) {
        const correctItemsArray = [];
        const usedItems = new Set();
        levelData.slots.forEach(slot => {
            const itemsForSlot = allItems.filter(item => 
                slot.index.includes(item.index) && !usedItems.has(item.id)
            );
            if (itemsForSlot.length > 0) {
                const randomItem = itemsForSlot[Math.floor(Math.random() * itemsForSlot.length)];
                correctItemsArray.push(randomItem);
                usedItems.add(randomItem.id);
            }
        });
        const distractorItems = allItems.filter(item => !usedItems.has(item.id));
        const finalDistractors = shuffleArray(distractorItems).slice(0, levelData.distractors);
        return shuffleArray([...correctItemsArray, ...finalDistractors]);
    }
    
    function renderChoiceZone(choicePool) {
        choiceZoneEl.innerHTML = '';
        choicePool.forEach(item => {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            img.dataset.index = item.index;
            img.addEventListener('click', () => handleChoiceClick(item, img));
            choiceZoneEl.appendChild(img);
        });
    }
    
    function startNewTurn() { /* ... същата функция ... */ }
    function activateNextSlot() { /* ... същата функция ... */ }
    function handleChoiceClick(chosenItem, chosenImgElement) { /* ... същата функция ... */ }
    function loadNextLayout() { /* ... същата функция ... */ }
    function showStartScreen() { /* ... същата функция ... */ }
    function showGameScreen() { /* ... същата функция ... */ }
    function setupEventListeners() { /* ... същата функция ... */ }
    function shuffleArray(array) { /* ... същата функция ... */ }

    initializeApp();
});
