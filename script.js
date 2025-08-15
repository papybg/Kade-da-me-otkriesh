document.addEventListener('DOMContentLoaded', () => {
    // --- ДЕФИНИРАНЕ НА ЕЛЕМЕНТИТЕ ---
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
    const winMessageEl = document.getElementById('winMessage');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const startTurnBtn = document.getElementById('startTurnBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn');

    // --- ПРОМЕНЛИВИ ЗА СЪСТОЯНИЕТО ---
    let allItems = [];
    let currentPortalData = {};
    let currentLayoutId = null;
    let isTurnActive = false;
    let availableSlots = [];
    let activeSlotData = null;
    let placedItems = {};
    let correctAnswers = 0;
    let totalSlots = 0;
    
    // --- ИНИЦИАЛИЗИРАНЕ НА ПРИЛОЖЕНИЕТО ---
    async function initializeApp() {
        try {
            const [themesResponse, portalsResponse] = await Promise.all([
                fetch('themes.json'),
                fetch('portals.json')
            ]);
            
            if (!themesResponse.ok || !portalsResponse.ok) {
                throw new Error('Конфигурационните файлове не бяха намерени');
            }
            
            const themesData = await themesResponse.json();
            const portalsData = await portalsResponse.json();
            
            allItems = themesData.allItems;
            renderPortals(portalsData.portals);
            setupEventListeners();
        } catch (error) {
            console.error("Грешка при инициализация:", error);
            gameMessageEl.textContent = "Грешка при зареждане на играта";
            gameMessageEl.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
        }
    }

    // --- РЕНДИРАНЕ НА ПОРТАЛИТЕ ---
    function renderPortals(portals) {
        portalContainerEl.innerHTML = '';
        portals.forEach(portal => {
            const portalEl = document.createElement('div');
            portalEl.className = 'portal';
            portalEl.innerHTML = `
                <img src="${portal.icon}" alt="${portal.name}">
                <div class="portal-name">${portal.name}</div>
            `;
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
        loadNextLayout();
    }

    // --- ЗАРЕЖДАНЕ НА СЛЕДВАЩОТО НИВО ---
    function loadNextLayout() {
        if (!currentPortalData.layouts || currentPortalData.layouts.length === 0) {
            gameMessageEl.textContent = "Няма налични нива за този портал";
            return;
        }
        
        // Зареждане на следващото ниво или първото ако няма текущо
        const nextIndex = currentLayoutId ? 
            (currentPortalData.layouts.indexOf(currentLayoutId) + 1 : 0;
        
        if (nextIndex >= currentPortalData.layouts.length) {
            winScreenEl.classList.remove('hidden');
            winMessageEl.textContent = "ПРЕМИНА ВСИЧКИ НИВА!";
            return;
        }
        
        currentLayoutId = currentPortalData.layouts[nextIndex];
        loadLayout(currentLayoutId);
    }

    // --- ЗАРЕЖДАНЕ НА КОНКРЕТНО НИВО ---
    async function loadLayout(layoutId) {
        try {
            const response = await fetch(`assets/layouts/${layoutId}.json`);
            if (!response.ok) throw new Error(`Нивото ${layoutId} не бе намерено`);
            
            const levelData = await response.json();
            resetGameState();
            
            // Зареждане на фона
            gameBoardEl.style.backgroundImage = `url('${levelData.background}')`;
            
            // Създаване на слотовете
            availableSlots = [...levelData.slots];
            totalSlots = availableSlots.length;
            createSlots(availableSlots);
            
            // Генериране на изборите
            const choicePool = generateChoicePool(levelData);
            renderChoiceZone(choicePool);
            
            // Подготвяне на интерфейса
            gameMessageEl.textContent = "Натисни СТАРТ за да започнеш!";
            gameMessageEl.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            startTurnBtn.classList.remove('hidden');
            
        } catch (error) {
            console.error(`Грешка при зареждане на ниво ${layoutId}:`, error);
            gameMessageEl.textContent = `Грешка при зареждане на ниво ${layoutId}`;
            gameMessageEl.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
        }
    }

    // --- ГЕНЕРИРАНЕ НА ИЗБОРИТЕ ---
    function generateChoicePool(levelData) {
        const correctItems = [];
        const usedItems = new Set();
        
        // Избор на по една правилна картинка за всеки слот
        levelData.slots.forEach(slot => {
            const possibleItems = allItems.filter(item => 
                slot.index.includes(item.index) && !usedItems.has(item.id)
            );
            
            if (possibleItems.length > 0) {
                const randomItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                correctItems.push(randomItem);
                usedItems.add(randomItem.id);
            }
        });
        
        // Добавяне на дистрактори до 8 общо
        const distractorCount = 8 - correctItems.length;
        const possibleDistractors = allItems.filter(item => !usedItems.has(item.id));
        const shuffledDistractors = shuffleArray(possibleDistractors).slice(0, distractorCount);
        
        return shuffleArray([...correctItems, ...shuffledDistractors]);
    }

    // --- РЕНДИРАНЕ НА ЗОНА ЗА ИЗБОР ---
    function renderChoiceZone(choicePool) {
        choiceZoneEl.innerHTML = '';
        choicePool.forEach(item => {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            img.dataset.id = item.id;
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
            slotEl.dataset.index = index;
            gameBoardEl.appendChild(slotEl);
        });
    }

    // --- СТАРТИРАНЕ НА ХОД ---
    function startNewTurn() {
        isTurnActive = true;
        startTurnBtn.classList.add('hidden');
        gameMessageEl.textContent = "Намери правилното място!";
        activateNextSlot();
    }

    // --- АКТИВИРАНЕ НА СЛЕДВАЩ СЛОТ ---
    function activateNextSlot() {
        // Деактивиране на текущия активен слот
        if (activeSlotData) {
            const prevSlot = document.querySelector(`.slot[data-index="${activeSlotData.index}"]`);
            if (prevSlot) prevSlot.classList.remove('active');
        }
        
        // Активиране на следващия слот
        if (availableSlots.length > 0) {
            activeSlotData = {
                slot: availableSlots[0],
                index: availableSlots[0].index,
                position: availableSlots[0].position
            };
            
            const activeSlotEl = document.querySelector(`.slot[data-index="${availableSlots[0].index}"]`);
            if (activeSlotEl) {
                activeSlotEl.classList.add('active');
                gameMessageEl.textContent = `Намери мястото за ${availableSlots[0].index.join('/')}`;
            }
        } else {
            // Няма повече слотове - победа!
            bravoAudio.play();
            winScreenEl.classList.remove('hidden');
            activeSlotData = null;
        }
    }

    // --- ОБРАБОТКА НА ИЗБОРА ---
    function handleChoiceClick(chosenItem, chosenImgElement) {
        if (!isTurnActive || !activeSlotData || chosenImgElement.classList.contains('used')) return;
        
        // Проверка дали изборът е валиден за активния слот
        const isValid = activeSlotData.slot.index.includes(chosenItem.index);
        
        if (isValid) {
            // Правилен избор
            bravoAudio.currentTime = 0;
            bravoAudio.play();
            
            // Поставяне на картинката в слота
            placeImageInSlot(chosenItem, activeSlotData);
            
            // Маркиране на картинката като използвана
            chosenImgElement.classList.add('used');
            
            // Премахване на слота от наличните
            availableSlots.shift();
            correctAnswers++;
            
            // Активиране на следващия слот
            setTimeout(activateNextSlot, 800);
        } else {
            // Грешен избор
            opitaiPakAudio.currentTime = 0;
            opitaiPakAudio.play();
            
            // Анимация за грешка
            chosenImgElement.style.borderColor = 'red';
            setTimeout(() => {
                if (chosenImgElement) chosenImgElement.style.borderColor = 'white';
            }, 500);
        }
    }

    // --- ПОСТАВЯНЕ НА КАРТИНКА В СЛОТ ---
    function placeImageInSlot(item, slotData) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.classList.add('placed-image');
        img.style.width = slotData.slot.diameter;
        img.style.height = slotData.slot.diameter;
        img.style.top = slotData.slot.position.top;
        img.style.left = slotData.slot.position.left;
        img.dataset.itemId = item.id;
        gameBoardEl.appendChild(img);
        
        // Запазване на поставената картинка
        placedItems[slotData.index] = item;
    }

    // --- НУЛИРАНЕ НА СЪСТОЯНИЕТО НА ИГРАТА ---
    function resetGameState() {
        isTurnActive = false;
        availableSlots = [];
        activeSlotData = null;
        placedItems = {};
        correctAnswers = 0;
        totalSlots = 0;
        winScreenEl.classList.add('hidden');
        startTurnBtn.classList.remove('hidden');
    }

    // --- НАСТРОЙКА НА СЛУШАТЕЛИТЕ ---
    function setupEventListeners() {
        startTurnBtn.addEventListener('click', startNewTurn);
        playAgainBtn.addEventListener('click', loadNextLayout);
        
        backToMenuBtn.addEventListener('click', () => {
            gameScreenEl.classList.remove('visible');
            gameScreenEl.classList.add('hidden');
            startScreenEl.classList.remove('hidden');
            startScreenEl.classList.add('visible');
        });
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
