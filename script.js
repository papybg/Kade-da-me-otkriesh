document.addEventListener('DOMContentLoaded', () => {
    // --- ЕЛЕМЕНТИТЕ ОСТАВАТ СЪЩИТЕ ---
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

    // --- СЪСТОЯНИЕТО НА ИГРАТА ОСТАВА СЪЩОТО ---
    let allItems = [];
    let currentPortalData = {};
    let currentLayoutId = null;
    let isTurnActive = false;
    let isMuted = false;

    // --- ОСНОВНА ЛОГИКА ---

    async function initializeApp() {
        try {
            const [themesResponse, portalsResponse] = await Promise.all([
                fetch('themes.json'),
                fetch('portals.json')
            ]);
            if (!themesResponse.ok || !portalsResponse.ok) {
                throw new Error('Един от конфигурационните файлове не можа да бъде зареден.');
            }
            const themesData = await themesResponse.json();
            const portalsData = await portalsResponse.json();
            allItems = themesData.allItems;
            renderPortals(portalsData.portals);
            showStartScreen();
        } catch (error) {
            console.error("Грешка при зареждане на конфигурационни файлове:", error);
            document.body.innerHTML = `<h1 style="color:red">Грешка при зареждане. Проверете файловете!</h1>`;
        }
    }

    // --- ТУК Е КОРЕКЦИЯТА ---
    function renderPortals(portals) {
        portalContainerEl.innerHTML = ''; // Изчистваме контейнера
        portals.forEach(portal => {
            // Създаваме елементите един по един, вместо с innerHTML
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

    // ... останалият код остава без промяна ...
    
    function startGame(portal) { /* ... */ }
    async function loadLayout(layoutId) { /* ... */ }
    function generateChoicePool(levelData) { /* ... */ }
    function renderChoiceZone(choicePool) { /* ... */ }
    function setupGameTurn(slots) { /* ... */ }
    function loadNextLayout() { /* ... */ }
    function showStartScreen() { /* ... */ }
    function showGameScreen() { /* ... */ }
    function toggleMute() { /* ... */ }
    
    playAgainBtn.addEventListener('click', loadNextLayout);
    backToMenuBtn.addEventListener('click', showStartScreen);
    soundBtn.addEventListener('click', toggleMute);

    initializeApp();
    
    function shuffleArray(array) { /* ... */ }
});
