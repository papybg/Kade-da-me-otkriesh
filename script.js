document.addEventListener('DOMContentLoaded', () => {
    // --- ЕЛЕМЕНТИ ---
    const bodyEl = document.body;
    const bravoAudio = document.getElementById('bravoAudio');
    const opitaiPakAudio = document.getElementById('opitaiPakAudio');
    const startScreenEl = document.getElementById('startScreen');
    const portalContainerEl = document.getElementById('portalContainer'); // <<-- ТОЗИ РЕД ЛИПСВАШЕ
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

    async function initializeApp() {
        try {
            const [themesResponse, portalsResponse] = await Promise.all([
                fetch('themes.json'),
                fetch('portals.json')
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
            const response = await fetch(`assets/layouts/${layoutId}.json`);
            if (!response.ok) throw new Error(`Layout file ${layoutId}.json not found`);
            const levelData = await response.json();
            currentLayoutId = layoutId;
            
            isTurnActive = false;
            winScreenEl.classList.add('hidden');
            startTurnBtn.classList.remove('hidden');
            gameMessageEl.textContent = 'Натисни "СТАРТ", за да светне кръгче!';
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
    
    function startNewTurn() {
        if (isTurnActive || availableSlots.length === 0) return;
        isTurnActive = true;
        startTurnBtn.classList.add('hidden');
        
        const randomIndex = Math.floor(Math.random() * availableSlots.length);
        activeSlotData = availableSlots[randomIndex];
        
        const highlighter = document.getElementById('slotHighlighter');
        highlighter.style.top = activeSlotData.position.top;
        highlighter.style.left = activeSlotData.position.left;
        highlighter.style.width = activeSlotData.diameter;
        
        highlighter.classList.remove('hidden', 'active');
        void highlighter.offsetWidth;
        highlighter.classList.add('active');
        gameMessageEl.textContent = 'Коя картинка е за тук?';
    }

    function handleChoiceClick(chosenItem, chosenImgElement) {
        if (!isTurnActive || chosenImgElement.classList.contains('used')) return;

        if (activeSlotData && activeSlotData.index.includes(chosenItem.index)) {
            bravoAudio.play();
            
            const placedImg = document.createElement('img');
            placedImg.src = chosenItem.image;
            placedImg.className = 'placed-image';
            placedImg.style.top = activeSlotData.position.top;
            placedImg.style.left = activeSlotData.position.left;
            placedImg.style.width = activeSlotData.diameter;
            gameBoardEl.appendChild(placedImg);

            document.getElementById('slotHighlighter').classList.add('hidden');
            chosenImgElement.classList.add('used');
            
            availableSlots = availableSlots.filter(slot => slot !== activeSlotData);
            
            if (availableSlots.length === 0) {
                isTurnActive = false;
                setTimeout(() => winScreenEl.classList.remove('hidden'), 1000);
            } else {
                // Автоматично активираме следващия слот
                isTurnActive = true; // Оставяме го true за следващия ход
                activateNextSlot();
            }
        } else {
            opitaiPakAudio.play();
            gameMessageEl.textContent = 'Опитай пак!';
        }
    }

    function loadNextLayout() {
        const layouts = currentPortalData.layouts;
        if (!layouts || layouts.length <= 1) {
            loadLayout(layouts ? layouts[0] : currentLayoutId);
            return;
        }
        let nextLayoutId;
        do {
            nextLayoutId = layouts[Math.floor(Math.random() * layouts.length)];
        } while (nextLayoutId === currentLayoutId);
        loadLayout(nextLayoutId);
    }
    
    function showStartScreen() {
        gameScreenEl.classList.remove('visible');
        gameScreenEl.classList.add('hidden');
        startScreenEl.classList.remove('hidden');
    }

    function showGameScreen() {
        startScreenEl.classList.add('hidden');
        gameScreenEl.classList.add('visible');
    }

    function setupEventListeners() {
        playAgainBtn.addEventListener('click', loadNextLayout);
        backToMenuBtn.addEventListener('click', showStartScreen);
        startTurnBtn.addEventListener('click', startNewTurn);
    }

    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    initializeApp();
});
