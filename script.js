document.addEventListener('DOMContentLoaded', () => {
    // --- ОБЩИ ЕЛЕМЕНТИ ---
    const bodyEl = document.body;
    const bravoAudio = document.getElementById('bravoAudio');
    const opitaiPakAudio = document.getElementById('opitaiPakAudio');

    // --- ЕЛЕМЕНТИ НА СТАРТОВ ЕКРАН ---
    const startScreenEl = document.getElementById('startScreen');
    const portalContainerEl = document.getElementById('portalContainer');
    const soundBtn = document.getElementById('soundBtn');

    // --- ЕЛЕМЕНТИ НА ЕКРАН ЗА ИГРА ---
    const gameScreenEl = document.getElementById('gameScreen');
    const dropZoneEl = document.getElementById('dropZone');
    const choiceZoneEl = document.getElementById('choiceZone');
    const gameMessageEl = document.getElementById('gameMessage');
    const gameTitleEl = document.getElementById('gameTitle');
    const winScreenEl = document.getElementById('winScreen');
    const playAgainBtn = document.getElementById('playAgainBtn'); // Бутон "Нова игра"
    const startTurnBtn = document.getElementById('startTurnBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn'); // Бутон "Портали" / Меню

    // --- СЪСТОЯНИЕ НА ИГРАТА ---
    let allItems = [];
    let currentPortalData = {};
    let currentLayoutId = null; // Пазим ID-то на текущата подредба
    let isTurnActive = false;
    let isMuted = false;

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
        showGameScreen();
        // Зареждаме случайна подредба при първо стартиране
        loadNextLayout();
    }

    async function loadLayout(layoutId) {
        try {
            const response = await fetch(`assets/layouts/${layoutId}.json`);
            const levelData = await response.json();
            currentLayoutId = layoutId; // Запазваме текущото ID
            
            isTurnActive = false;
            winScreenEl.classList.add('hidden');
            startTurnBtn.classList.remove('hidden');
            gameMessageEl.textContent = 'Натисни "СТАРТ", за да светне кръгче!';
            bodyEl.style.backgroundImage = `url('${currentPortalData.background}')`;
            gameTitleEl.textContent = currentPortalData.name;
            dropZoneEl.innerHTML = '<div id="slotHighlighter" class="hidden"></div>'; 
            
            const availableSlots = [...levelData.slots];
            const choicePool = generateChoicePool(levelData);
            
            renderChoiceZone(choicePool);
            setupGameTurn(availableSlots);

        } catch(error) {
            console.error(`Грешка при зареждане на подредба ${layoutId}.json:`, error);
        }
    }

    function generateChoicePool(levelData) {
        const correctItemsForLevel = new Set();
        levelData.slots.forEach(slot => {
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

    function setupGameTurn(slots) {
        let availableSlots = [...slots];
        let activeSlotData = null;

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
                highlighter.style.top = activeSlotData.position.top;
                highlighter.style.left = activeSlotData.position.left;
                highlighter.style.width = activeSlotData.diameter;
                highlighter.style.height = activeSlotData.diameter;
                
                highlighter.classList.remove('hidden', 'active');
                void highlighter.offsetWidth;
                highlighter.classList.add('active');

                gameMessageEl.textContent = 'Коя картинка е за тук?';
            }
        }

        window.handleChoiceClick = (chosenItem, chosenImgElement) => {
            if (!isTurnActive || chosenImgElement.classList.contains('used')) return;

            if (activeSlotData.index.includes(chosenItem.index)) {
                isTurnActive = false;
                if (!isMuted) bravoAudio.play();
                
                const placedImg = document.createElement('img');
                placedImg.src = chosenItem.image;
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
                    setTimeout(() => winScreenEl.classList.remove('hidden'), 1000);
                } else {
                    startTurnBtn.classList.remove('hidden');
                    gameMessageEl.textContent = 'Натисни "СТАРТ" за следващия кръг!';
                }
            } else {
                if (!isMuted) opitaiPakAudio.play();
                gameMessageEl.textContent = 'Опитай пак!';
            }
        };
        startTurnBtn.onclick = startNewTurn;
    }

    function loadNextLayout() {
        const layouts = currentPortalData.layouts;
        if (layouts.length <= 1) {
            loadLayout(layouts[0]); // Ако има само 1, зареждаме пак него
            return;
        }

        // Избираме нова подредба, различна от текущата
        let nextLayoutId;
        do {
            nextLayoutId = layouts[Math.floor(Math.random() * layouts.length)];
        } while (nextLayoutId === currentLayoutId);
        
        loadLayout(nextLayoutId);
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

    function toggleMute() {
        isMuted = !isMuted;
        soundBtn.textContent = isMuted ? '🔇' : '🔊';
    }

    // --- Event Listeners ---
    playAgainBtn.addEventListener('click', loadNextLayout);
    backToMenuBtn.addEventListener('click', showStartScreen);
    soundBtn.addEventListener('click', toggleMute);

    // --- Старт на приложението ---
    initializeApp();
    
    // --- Helper функция за разбъркване ---
    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }
});
