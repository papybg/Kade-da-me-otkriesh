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
            
            const imgEl = document.createElement('img');
            imgEl.src = portal.icon;
            imgEl.alt = portal.name;

            const nameEl = document.createElement('div');
            nameEl.className = 'portal-name';
            nameEl.textContent = portal.name;

            portalEl.appendChild(imgEl);
            portalEl.appendChild(nameEl);
            
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
            dropZoneEl.innerHTML = '<div id="slotHighlighter" class="hidden"></div>'; 
            
            availableSlots = [...levelData.slots];
            const choicePool = generateChoicePool(levelData);
            renderChoiceZone(choicePool);
            setupGameTurn(levelData.slots);
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
            img.addEventListener('click', () => window.handleChoiceClick(item, img));
            choiceZoneEl.appendChild(img);
        });
    }

    function setupGameTurn(slots) {
        let currentAvailableSlots = [...slots];
        let activeSlotData = null;

        const startNewTurn = () => {
            if (isTurnActive) return;
            isTurnActive = true;
            startTurnBtn.classList.add('hidden');
            activateNextSlot();
        };

        const activateNextSlot = () => {
            if (currentAvailableSlots.length > 0) {
                const randomIndex = Math.floor(Math.random() * currentAvailableSlots.length);
                activeSlotData = currentAvailableSlots[randomIndex];
                
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
        };

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
                
                currentAvailableSlots = currentAvailableSlots.filter(slot => slot !== activeSlotData);
                
                if (currentAvailableSlots.length === 0) {
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
            loadLayout(layouts[0]);
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
        gameScreenEl.classList.remove('visible');
        gameScreenEl.classList.add('hidden');
        startScreenEl.classList.remove('hidden');
    }

    function showGameScreen() {
        startScreenEl.classList.add('hidden');
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

    initializeApp();
    
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
