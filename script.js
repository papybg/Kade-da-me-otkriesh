document.addEventListener('DOMContentLoaded', () => {
    // ... ЕЛЕМЕНТИТЕ И СЪСТОЯНИЕТО ОСТАВАТ СЪЩИТЕ ...
    let allItems = [], currentPortalData = {}, currentLayoutId = null, isTurnActive = false, availableSlots = [], activeSlotData = null;

    async function initializeApp() {
        try {
            const [themesResponse, portalsResponse] = await Promise.all([ fetch('themes.json'), fetch('portals.json') ]);
            if (!themesResponse.ok || !portalsResponse.ok) throw new Error('Config files not found');
            allItems = (await themesResponse.json()).allItems;
            const portals = (await portalsResponse.json()).portals;
            renderPortals(portals);
            setupEventListeners();
            showStartScreen();
        } catch (error) { console.error("Initialization Error:", error); }
    }

    // --- ТУК Е ПРОМЯНАТА ЗА ИКОНИТЕ ---
    function renderPortals(portals) {
        portalContainerEl.innerHTML = '';
        portals.forEach(portal => {
            const portalEl = document.createElement('div');
            portalEl.className = 'portal';
            
            const imgEl = document.createElement('img');
            imgEl.srcset = `${portal.icon_small} 320w, ${portal.icon_large} 640w`;
            imgEl.sizes = "250px";
            imgEl.src = portal.icon_large; // Fallback
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

    // --- ТУК Е ПРОМЯНАТА ЗА ФОНА ---
    async function loadLayout(layoutId) {
        try {
            const response = await fetch(`assets/layouts/${layoutId}.json`);
            if (!response.ok) throw new Error(`Layout file ${layoutId}.json not found`);
            const levelData = await response.json();
            currentLayoutId = layoutId;
            
            // ... нулиране на състоянието ...
            isTurnActive = false;
            winScreenEl.classList.add('hidden');
            startTurnBtn.classList.remove('hidden');
            gameMessageEl.textContent = 'Натисни "СТАРТ"!';

            // Вместо да задаваме фона директно, добавяме клас
            gameBoardEl.className = ''; // Изчистваме стари класове
            gameBoardEl.classList.add(`background-${currentPortalData.id}`);

            gameTitleEl.textContent = currentPortalData.name;
            gameBoardEl.innerHTML = '<div id="slotHighlighter" class="hidden"></div>'; 
            
            availableSlots = [...levelData.slots];
            const choicePool = generateChoicePool(levelData);
            renderChoiceZone(choicePool);
        } catch(error) { console.error(`Error loading layout ${layoutId}.json:`, error); }
    }

    // ... останалите функции са без промяна ...
    function generateChoicePool(levelData) { /* ... */ }
    function renderChoiceZone(choicePool) { /* ... */ }
    function startNewTurn() { /* ... */ }
    function handleChoiceClick(chosenItem, chosenImgElement) { /* ... */ }
    function loadNextLayout() { /* ... */ }
    function showStartScreen() { /* ... */ }
    function showGameScreen() { /* ... */ }
    function setupEventListeners() { /* ... */ }
    function shuffleArray(array) { /* ... */ }

    initializeApp();
});
