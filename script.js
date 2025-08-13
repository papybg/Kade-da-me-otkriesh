document.addEventListener('DOMContentLoaded', () => {
    // --- ОБЩИ ЕЛЕМЕНТИ ---
    const bodyEl = document.body;
    const bravoAudio = document.getElementById('bravoAudio');
    const opitaiPakAudio = document.getElementById('opitaiPakAudio');

    // --- ЕЛЕМЕНТИ НА СТАРТОВ ЕКРАН ---
    const startScreenEl = document.getElementById('startScreen');
    const portalContainerEl = document.getElementById('portalContainer');

    // --- ЕЛЕМЕНТИ НА ЕКРАН ЗА ИГРА ---
    const gameScreenEl = document.getElementById('gameScreen');
    const dropZoneEl = document.getElementById('dropZone');
    const choiceZoneEl = document.getElementById('choiceZone');
    const gameMessageEl = document.getElementById('gameMessage');
    const gameTitleEl = document.getElementById('gameTitle');
    const winScreenEl = document.getElementById('winScreen');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const startTurnBtn = document.getElementById('startTurnBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn');

    // --- СЪСТОЯНИЕ НА ИГРАТА ---
    let allItems = [];
    let currentPortalData = {};
    let currentLayouts = [];
    let currentLayoutIndex = 0;
    let currentLevelData = {};
    let activeSlotData = null;
    let isTurnActive = false;
    let availableSlots = [];

    // --- ОСНОВНА ЛОГИКА ---

    async function initializeApp() {
        try {
            const themesResponse = await fetch('themes.json');
            allItems = (await themesResponse.json()).allItems;
            
            const portalsResponse = await fetch('portals.json');
            const portals = (await portalsResponse.json()).portals;

            renderPortals(portals);
            showStartScreen();

        } catch (error) {
            console.error("Грешка при зареждане на конфигурационни файлове:", error);
            document.body.innerHTML = `<h1 style="color:red">Грешка при зареждане. Проверете файловете!</h1>`;
        }
    }

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

    function startGame(portal) {
        currentPortalData = portal;
        currentLayouts = shuffleArray(portal.layouts);
        currentLayoutIndex = 0;
        showGameScreen();
        loadLayout(currentLayouts[currentLayoutIndex]);
    }

    async function loadLayout(layoutId) {
        try {
            const response = await fetch(`assets/layouts/${layoutId}.json`);
            currentLevelData = await response.json();
            
            isTurnActive = false;
            winScreenEl.classList.add('hidden');
            startTurnBtn.classList.remove('hidden');
            gameMessageEl.textContent = 'Натисни "СТАРТ", за да светне кръгче!';
            bodyEl.style.backgroundImage = `url('${currentPortalData.background}')`;
            gameTitleEl.innerHTML = currentPortalData.name;
            dropZoneEl.innerHTML = '<div id="slotHighlighter" class="hidden"></div>'; 
            
            availableSlots = [...currentLevelData.slots];

            generateChoicePool();
            renderChoiceZone();
        } catch(error) {
            console.error(`Грешка при зареждане на подредба ${layoutId}.json:`, error);
        }
    }

    function generateChoicePool() {
        const correctItemsForLevel = new Set();
        currentLevelData.slots.forEach(slot => {
            const itemsForSlot = allItems.filter(item => slot.index.includes(item.index));
            if (itemsForSlot.length > 0) {
                 const availableItems = itemsForSlot.filter(item => ![...correctItemsForLevel].includes(item));
                const itemToPush = availableItems.length > 0 ? availableItems[Math.floor(Math.random() * availableItems.length)] : itemsForSlot[0];
                 correctItemsForLevel.add(itemToPush);
            }
        });

        const correctItemsArray = Array.from(correctItemsForLevel);
        const distractorItems = allItems.filter(item => 
            !correctItemsArray.some(correct => correct.id === item.id)
        );
        const finalDistractors = shuffleArray(distractorItems).slice(0, currentLevelData.distractors);
        choicePool = shuffleArray([...correctItemsArray, ...finalDistractors]);
    }
    
    function renderChoiceZone() {
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
        activateNextSlot();
    }

    function activateNextSlot() {
        if (availableSlots.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableSlots.length);
            activeSlotData = availableSlots[randomIndex];
            
            const highlighter = document.getElementById('slotHighlighter');
            const pos = activeSlotData.position;
            const size = activeSlotData.diameter;

            highlighter.style.top = pos.top;
            highlighter.style.left = pos.left;
            highlighter.style.width = size;
            highlighter.style.height = size;
            
            highlighter.classList.remove('hidden', 'active');
            void highlighter.offsetWidth;
            highlighter.classList.add('active');

            gameMessageEl.textContent = 'Коя картинка е за тук?';
        }
    }

    function handleChoiceClick(chosenItem, chosenImgElement) {
        if (!isTurnActive || chosenImgElement.classList.contains('used')) return;

        if (activeSlotData.index.includes(chosenItem.index)) {
            isTurnActive = false;
            bravoAudio.play();
            
            const placedImg = document.createElement('img');
            placedImg.src = chosenItem.image;
            placedImg.alt = chosenItem.name;
            placedImg.className = 'placed-image';
            placedImg.style.top = activeSlotData.position.top;
            placedImg.style.left = activeSlotData.position.left;
            placedImg.style.width = activeSlotData.diameter;
            placedImg.style.height = activeSlotData.diameter;
            dropZoneEl.appendChild(placedImg);

            document.getElementById('slotHighlighter').classList.add('hidden');
            chosenImgElement.classList.add('used');
            
            availableSlots = availableSlots.filter(slot => slot !== activeSlotData);
            
            if (availableSlots.length === 0) {
                setTimeout(() => {
                    winScreenEl.classList.remove('hidden');
                    gameMessageEl.textContent = 'Супер си!';
                }, 1000);
            } else {
                startTurnBtn.classList.remove('hidden');
                gameMessageEl.textContent = 'Натисни "СТАРТ" за следващия кръг!';
            }
        } else {
            opitaiPakAudio.play();
            gameMessageEl.textContent = 'Опитай пак!';
        }
    }

    function loadNextLayout() {
        currentLayoutIndex++;
        if (currentLayoutIndex >= currentLayouts.length) {
            currentLayoutIndex = 0; // Въртим се в кръг
        }
        loadLayout(currentLayouts[currentLayoutIndex]);
    }
    
    function showStartScreen() {
        bodyEl.style.backgroundImage = 'none';
        bodyEl.style.backgroundColor = '#2c3e50';
        gameScreenEl.classList.remove('visible');
        gameScreenEl.classList.add('hidden');
        startScreenEl.classList.remove('hidden');
    }

    function showGameScreen() {
        startScreenEl.classList.add('hidden');
        gameScreenEl.classList.remove('hidden');
        gameScreenEl.classList.add('visible');
    }

    // --- Event Listeners ---
    playAgainBtn.addEventListener('click', loadNextLayout);
    startTurnBtn.addEventListener('click', startNewTurn);
    backToMenuBtn.addEventListener('click', showStartScreen);

    // --- Старт на приложението ---
    initializeApp();
    
    // --- Helper функция за разбъркване ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});
