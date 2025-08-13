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

    // --- СЪСТОЯНИЕ НА ИГРАТА ---
    let allItems = [];
    let currentLevelData = {};
    let activeSlotData = null;
    let filledSlotsCount = 0;
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
            document.body.innerHTML = `<h1 style="color:red">Грешка при зареждане. Проверете файловете themes.json и portals.json!</h1>`;
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

    async function startGame(portal) {
        showGameScreen();
        
        try {
            const response = await fetch(portal.levelFile);
            currentLevelData = await response.json();
            
            const levelPath = portal.levelFile.substring(0, portal.levelFile.lastIndexOf('/') + 1);
            
            loadLevel(levelPath, currentLevelData);
        } catch (error) {
            console.error(`Грешка при зареждане на ниво ${portal.levelFile}:`, error);
        }
    }

    function loadLevel(levelPath, levelData) {
        filledSlotsCount = 0;
        isTurnActive = false;
        winScreenEl.classList.add('hidden');
        startTurnBtn.classList.remove('hidden');
        gameMessageEl.textContent = 'Натисни "СТАРТ", за да светне кръгче!';
        bodyEl.style.backgroundImage = `url('${levelPath}${levelData.background}')`;
        gameTitleEl.innerHTML = levelData.name;
        dropZoneEl.innerHTML = '<div id="slotHighlighter" class="hidden"></div>'; 
        
        availableSlots = [...levelData.slots];

        generateChoicePool();
        renderChoiceZone();
    }

    function generateChoicePool() {
        const correctItemsForLevel = new Set();
        currentLevelData.slots.forEach(slot => {
            const itemsForSlot = allItems.filter(item => slot.index.includes(item.index));
            if (itemsForSlot.length > 0) {
                 const availableItems = itemsForSlot.filter(item => ![...correctItemsForLevel].includes(item));
                const itemToPush = availableItems.length > 0 ? availableItems[0] : itemsForSlot[0];
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
            placedImg.style.transform = 'translate(-50%, -50%)'; // Центриране
            dropZoneEl.appendChild(placedImg);

            document.getElementById('slotHighlighter').classList.add('hidden');
            chosenImgElement.classList.add('used');
            
            availableSlots = availableSlots.filter(slot => slot !== activeSlotData);
            filledSlotsCount++;
            
            if (filledSlotsCount === currentLevelData.slots.length) {
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

    function showStartScreen() {
        bodyEl.style.backgroundImage = 'none'; // или някакъв общ фон за менюто
        bodyEl.style.backgroundColor = '#2c3e50';
        gameScreenEl.classList.add('hidden');
        startScreenEl.classList.remove('hidden');
    }

    function showGameScreen() {
        startScreenEl.classList.add('hidden');
        gameScreenEl.classList.remove('hidden');
    }

    // --- Event Listeners ---
    playAgainBtn.addEventListener('click', showStartScreen);
    startTurnBtn.addEventListener('click', startNewTurn);

    // --- Старт на приложението ---
    initializeApp();
});
