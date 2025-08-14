document.addEventListener('DOMContentLoaded', () => {
    // --- ЕЛЕМЕНТИ ---
    const bodyEl = document.body;
    const bravoAudio = document.getElementById('bravoAudio');
    const opitaiPakAudio = document.getElementById('opitaiPakAudio');
    const startScreenEl = document.getElementById('startScreen');
    const portalContainerEl = document.getElementById('portalContainer');
    const soundBtn = document.getElementById('soundBtn');
    const gameScreenEl = document.getElementById('gameScreen');
    const dropZoneEl = document.getElementById('dropZone');
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
    let isMuted = false;
    let availableSlots = [];
    let activeSlotData = null;

    // --- ОСНОВНА ЛОГИКА ---

    async function initializeApp() {
        try {
            const [themesResponse, portalsResponse] = await Promise.all([
                fetch('themes.json'),
                fetch('portals.json')
            ]);
            if (!themesResponse.ok || !portalsResponse.ok) {
                throw new Error('Конфигурационните файлове не са намерени.');
            }
            const themesData = await themesResponse.json();
            const portalsData = await portalsResponse.json();
            allItems = themesData.allItems;
            
            renderPortals(portalsData.portals);
            setupEventListeners();
            showStartScreen();
        } catch (error) {
            console.error("Грешка при инициализация:", error);
            document.body.innerHTML = `<h1>Грешка при зареждане. Проверете конзолата (F12).</h1>`;
        }
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
            const levelData = await response.json();
            currentLayoutId = layoutId;
            
            isTurnActive = false;
            winScreenEl.classList.add('hidden');
            startTurnBtn.classList.remove('hidden');
            gameMessageEl.textContent = 'Натисни "СТАРТ", за да светне кръгче!';
            bodyEl.style.backgroundImage = `url('${currentPortalData.background}')`;
            gameTitleEl.textContent = currentPortalData.name;
            dropZoneEl.innerHTML = '<div id="slotHighlighter" class="slot-highlight hidden"></div>'; 
            
            availableSlots = [...levelData.slots];
            const choicePool = generateChoicePool(levelData);
            renderChoiceZone(choicePool);
        } catch(error) {
            console.error(`Грешка при зареждане на подредба ${layoutId}.json:`, error);
        }
    }

    function generateChoicePool(levelData) {
        const correctItemsArray = [];
        levelData.slots.forEach(slot => {
            const itemsForSlot = allItems.filter(item => slot.index.includes(item.index));
            if (itemsForSlot.length > 0) {
                const randomItem = itemsForSlot[Math.floor(Math.random() * itemsForSlot.length)];
                correctItemsArray.push(randomItem);
            }
        });

        const distractorItems = allItems.filter(item => 
            !correctItemsArray.some(correct => correct.id === item.id)
        );
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
        if (isTurnActive) return;
        isTurnActive = true;
        startTurnBtn.classList.add('hidden');
        
        if (availableSlots.length > 0) {
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
    }

    function handleChoiceClick(chosenItem, chosenImgElement) {
        if (!isTurnActive || chosenImgElement.classList.contains('used')) return;

        if (activeSlotData && activeSlotData.index.includes(chosenItem.index)) {
            isTurnActive = false;
            if (!isMuted) bravoAudio.play();
            
            const placedImg = document.createElement('div');
            placedImg.className = 'placed-image';
            placedImg.innerHTML = `<img src="${chosenItem.image}" alt="${chosenItem.name}">`;
            placedImg.style.top = activeSlotData.position.top;
            placedImg.style.left = activeSlotData.position.left;
            placedImg.style.width = activeSlotData.diameter;
            dropZoneEl.appendChild(placedImg);

            document.getElementById('slotHighlighter').classList.add('hidden');
            chosenImgElement.classList.add('used');
            
            availableSlots = availableSlots.filter(slot => slot !== activeSlotData);
            
            if (availableSlots.length === 0) {
                setTimeout(() => winScreenEl.classList.remove('hidden'), 1000);
            } else {
                startTurnBtn.classList.remove('hidden');
                gameMessageEl.textContent = 'Натисни "СТАРТ" за следващия кръг!';
            }
        } else {
            if (!isMuted) opitaiPakAudio.play();
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
        bodyEl.style.backgroundImage = 'none';
        bodyEl.style.backgroundColor = '#2c3e50';
        gameScreenEl.classList.add('hidden');
        startScreenEl.classList.remove('hidden');
    }

    function showGameScreen() {
        startScreenEl.classList.add('hidden');
        gameScreenEl.classList.remove('hidden');
    }

    function toggleMute() {
        isMuted = !isMuted;
        soundBtn.textContent = isMuted ? '🔇' : '🔊';
    }
    
    function setupEventListeners() {
        playAgainBtn.addEventListener('click', loadNextLayout);
        backToMenuBtn.addEventListener('click', showStartScreen);
        soundBtn.addEventListener('click', toggleMute);
        startTurnBtn.addEventListener('click', startNewTurn);
    }

    initializeApp();
    
    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }
});
