document.addEventListener('DOMContentLoaded', () => {
    // --- КОД ЗА ВРЕМЕВИ ИНДИКАТОР ---
    const versionDisplay = document.getElementById('version-display');
    if (versionDisplay) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        versionDisplay.textContent = `V: ${hours}:${minutes}:${seconds}`;
    }
    // --- КРАЙ НА КОДА ЗА ВРЕМЕВИ ИНДИКАТОР ---

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
    const winScreenMenuBtn = document.getElementById('winScreenMenuBtn');

    // --- ПРОМЕНЛИВИ ЗА СЪСТОЯНИЕТО ---
    let allItems = [];
    let portalsData = [];
    let layoutsData = {};
    let currentPortalData = {}, currentLayoutId = null;
    let isTurnActive = false, availableSlots = [], activeSlotData = null;
    
    // --- АУДИО СИСТЕМА ---
    let audioInitialized = false;
    function initializeAudio() {
        if (audioInitialized || typeof Tone === 'undefined') return;
        try {
            Tone.start();
            audioInitialized = true;
        } catch (e) {
            console.error("Грешка при инициализиране на аудиото:", e);
        }
    }

    // --- Функция за зареждане на данни ---
    async function loadAllData() {
        try {
            const [portalsRes, itemsRes] = await Promise.all([
                fetch('portals.json'),
                fetch('themes.json')
            ]);

            if (!portalsRes.ok) throw new Error(`portals.json: ${portalsRes.statusText}`);
            if (!itemsRes.ok) throw new Error(`themes.json: ${itemsRes.statusText}`);

            const portalsJson = await portalsRes.json();
            const itemsJson = await itemsRes.json();

            portalsData = portalsJson.portals;
            allItems = itemsJson.allItems;

            const layoutIds = new Set();
            portalsData.forEach(portal => {
                portal.layouts.forEach(layoutId => layoutIds.add(layoutId));
            });

            const layoutFetchPromises = Array.from(layoutIds).map(id => {
                return fetch(`assets/layouts/${id}.json`)
                    .then(res => {
                        if (!res.ok) throw new Error(`File not found: assets/layouts/${id}.json`);
                        return res.json();
                    });
            });

            const loadedLayouts = await Promise.all(layoutFetchPromises);

            loadedLayouts.forEach((layoutContent, index) => {
                const layoutId = Array.from(layoutIds)[index];
                layoutsData[layoutId] = layoutContent;
            });

        } catch (error) {
            console.error("Критична грешка при зареждане:", error);
            document.body.innerHTML = `<h1>Грешка при зареждане на играта.</h1><p>${error.message}</p><p>Проверете имената на файловете в GitHub (напр. themes.json) и конзолата (F12).</p>`;
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
        if (!portalContainerEl) return;
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
        startScreenEl.classList.add('hidden');
        gameScreenEl.classList.remove('hidden');
        gameScreenEl.classList.add('visible');
        gameTitleEl.textContent = portal.name;
        currentLayoutId = portal.layouts[0];
        loadLayout(currentLayoutId);
    }
    
    function loadLayout(layoutId) {
        winScreenEl.classList.add('hidden');
        const levelData = layoutsData[layoutId];
        if (!levelData) { console.error(`Нивото ${layoutId} не бе намерено`); return; }
        
        resetGameState();
        
        const isMobile = window.innerWidth < 768;
        const backgroundUrl = isMobile ? levelData.background_small : levelData.background_large;
        gameBoardEl.style.backgroundImage = `url('${backgroundUrl}')`;

        availableSlots = JSON.parse(JSON.stringify(levelData.slots));
        createSlots(availableSlots);
        const choicePool = generateChoicePool(levelData);
        renderChoiceZone(choicePool);
        
        gameMessageEl.textContent = "Натисни СТАРТ за да започнеш!";
        startTurnBtn.classList.remove('hidden');
    }

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

    function startNewTurn() {
        isTurnActive = true;
        startTurnBtn.classList.add('hidden');
        activateNextSlot();
    }

    function activateNextSlot() {
        if (activeSlotData && activeSlotData.originalIndex !== undefined) {
            const prevSlotEl = document.querySelector(`.slot[data-original-index="${activeSlotData.originalIndex}"]`);
            if (prevSlotEl) prevSlotEl.classList.remove('active');
        }

        if (availableSlots.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableSlots.length);
            const randomSlotData = availableSlots[randomIndex];
            
            const originalSlotIndex = Object.values(layoutsData).flatMap(l => l.slots).findIndex(s => 
                s.position.top === randomSlotData.position.top && s.position.left === randomSlotData.position.left
            );
            
            activeSlotData = { ...randomSlotData, originalIndex: originalSlotIndex };
            
            const activeSlotEl = document.querySelector(`.slot[data-original-index="${activeSlotData.originalIndex}"]`);
            if (activeSlotEl) {
                activeSlotEl.classList.add('active');
                gameMessageEl.textContent = `Какво ще има тук?`;
            }
        } else {
            showFeedback(true, "БРАВО!");
            setTimeout(() => {
                winMessageEl.textContent = "БРАВО, ДА ОПИТАМЕ ПАК!";
                winScreenEl.classList.remove('hidden');
            }, 1500);
            activeSlotData = null;
        }
    }

    function handleChoiceClick(chosenItem, chosenImgElement) {
        if (!isTurnActive || !activeSlotData || chosenImgElement.classList.contains('used')) return;

        const isValid = activeSlotData.index.includes(chosenItem.index);
        
        if (isValid) {
            showFeedback(true, "Браво!");
            placeImageInSlot(chosenItem, activeSlotData);
            chosenImgElement.classList.add('used');
            
            availableSlots = availableSlots.filter(slot => 
                slot.position.top !== activeSlotData.position.top || slot.position.left !== activeSlotData.position.left
            );

            setTimeout(activateNextSlot, 1500);
        } else {
            showFeedback(false, "Опитай пак!");
            chosenImgElement.style.borderColor = 'red';
            setTimeout(() => { if (chosenImgElement) chosenImgElement.style.borderColor = 'white'; }, 500);
        }
    }
    
    function showFeedback(isCorrect, message) {
        const feedbackEl = document.getElementById('feedbackMessage');
        if (!feedbackEl) return; 

        feedbackEl.textContent = message;
        feedbackEl.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
        feedbackEl.classList.add('show');
        setTimeout(() => {
            feedbackEl.classList.remove('show');
        }, 1200);
    }

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
        
        container.appendChild(img);
        document.getElementById('dropZone').appendChild(container);
    }

    function resetGameState() {
        isTurnActive = false;
        availableSlots = [];
        activeSlotData = null;
        const dropZone = document.getElementById('dropZone');
        if(dropZone) dropZone.innerHTML = '<div id="feedbackMessage"></div>';
        winScreenEl.classList.add('hidden');
        startTurnBtn.classList.remove('hidden');
    }

    function showMenu() {
        gameScreenEl.classList.add('hidden');
        startScreenEl.classList.remove('hidden');
        startScreenEl.classList.add('visible');
    }

    function setupEventListeners() {
        const enterGameButton = document.getElementById('enterGameBtn');
        if (enterGameButton) {
            enterGameButton.onclick = function() {
                initializeAudio();
                welcomeScreenEl.classList.add('hidden');
                startScreenEl.classList.remove('hidden');
                startScreenEl.classList.add('visible');
            };
        }
        
        playAgainBtn.addEventListener('click', () => loadLayout(currentLayoutId));
        backToMenuBtn.addEventListener('click', showMenu);
        winScreenMenuBtn.addEventListener('click', showMenu);
        startTurnBtn.addEventListener('click', startNewTurn);
    }

    function shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    initializeApp();
});
