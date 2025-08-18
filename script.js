document.addEventListener('DOMContentLoaded', () => {
    // --- ДЕФИНИРАНЕ НА ЕЛЕМЕНТИТЕ ---
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

    // --- АУДИО СИСТЕМА с Tone.js ---
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
    let currentPortalData = {};
    let currentLayoutId = null;
    let isTurnActive = false;
    let availableSlots = [];
    let activeSlotData = null;
    let totalSlots = 0;

    // --- ВГРАДЕНИ ДАННИ ---
    async function loadGameData() {
        const baseURL = "https://raw.githubusercontent.com/papybg/Kade-da-me-otkriesh/main/";
        
        const themesResponse = await fetch(baseURL + 'themes.json');
        const themesData = await themesResponse.json();
        allItems = themesData.allItems.map(item => ({...item, image: baseURL + item.image }));

        const portalsResponse = await fetch(baseURL + 'portals.json');
        const portalsDataFromServer = await portalsResponse.json();
        portalsData = portalsDataFromServer.portals.map(portal => ({
            ...portal,
            icon: baseURL + portal.icon
        }));
        
        for (const portal of portalsData) {
            for (const layoutId of portal.layouts) {
                if (!layoutsData[layoutId]) {
                    const layoutResponse = await fetch(`${baseURL}assets/layouts/${layoutId}.json`);
                    const layoutJson = await layoutResponse.json();
                    layoutsData[layoutId] = {
                        ...layoutJson,
                        background: baseURL + layoutJson.background
                    };
                }
            }
        }
    }

    // --- ИНИЦИАЛИЗИРАНЕ НА ПРИЛОЖЕНИЕТО ---
    async function initializeApp() {
        try {
            await loadGameData();
            renderPortals(portalsData);
            setupEventListeners();
        } catch (error) {
            console.error("Грешка при инициализация:", error);
            portalContainerEl.innerHTML = `<p style="color:red;">Грешка при зареждане на играта. Проверете конзолата за повече информация.</p>`;
        }
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
        initializeAudio();
        currentPortalData = portal;
        startScreenEl.classList.remove('visible');
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
        if (!levelData) {
            console.error(`Нивото ${layoutId} не бе намерено`);
            return;
        }
        resetGameState();
        gameBoardEl.style.backgroundImage = `url('${levelData.background}')`;
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
        gameBoardEl.innerHTML = '';
        slots.forEach((slot, index) => {
            const slotEl = document.createElement('div');
            slotEl.className = 'slot';
            slotEl.style.width = slot.diameter;
            slotEl.style.height = slot.diameter;
            slotEl.style.top = slot.position.top;
            slotEl.style.left = slot.position.left;
            slotEl.dataset.originalIndex = index;
            gameBoardEl.appendChild(slotEl);
        });
    }

    // --- СТАРТИРАНЕ НА ХОД ---
    function startNewTurn() {
        isTurnActive = true;
        startTurnBtn.classList.add('hidden');
        activateNextSlot();
    }

    // --- АКТИВИРАНЕ НА СЛЕДВАЩ СЛОТ ---
    function activateNextSlot() {
        if (activeSlotData) {
            const prevSlot = document.querySelector(`.slot[data-original-index="${activeSlotData.originalIndex}"]`);
            if (prevSlot) prevSlot.classList.remove('active');
        }
        
        if (availableSlots.length > 0) {
            activeSlotData = { ...availableSlots[0], originalIndex: totalSlots - availableSlots.length };
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
            availableSlots.shift();
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
        feedbackMessageEl.textContent = message;
        feedbackMessageEl.className = isCorrect ? 'correct' : 'wrong';
        feedbackMessageEl.classList.add('show');
        setTimeout(() => { feedbackMessageEl.classList.remove('show'); }, 1500);
    }

    // --- ПОСТАВЯНЕ НА КАРТИНКА В СЛОТ ---
    function placeImageInSlot(item, slotData) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.classList.add('placed-image');
        img.style.width = slotData.diameter;
        img.style.height = slotData.diameter;
        img.style.top = slotData.position.top;
        img.style.left = slotData.position.left;
        gameBoardEl.appendChild(img);
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

    // --- НАСТРОЙКА НА СЛУШАТЕЛИТЕ ---
    function setupEventListeners() {
        startTurnBtn.addEventListener('click', startNewTurn);
        playAgainBtn.addEventListener('click', () => loadLayout(currentLayoutId));
        backToMenuBtn.addEventListener('click', showMenu);
        winScreenMenuBtn.addEventListener('click', showMenu);
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
});
