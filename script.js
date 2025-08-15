document.addEventListener('DOMContentLoaded', () => {
    // DOM елементи
    const startScreen = document.getElementById('startScreen');
    const gameScreen = document.getElementById('gameScreen');
    const portalContainer = document.getElementById('portalContainer');
    const gameBoard = document.getElementById('gameBoard');
    const choiceZone = document.getElementById('choiceZone');
    const gameTitle = document.getElementById('gameTitle');
    const winScreen = document.getElementById('winScreen');
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const bravoAudio = document.getElementById('bravoAudio');
    const opitaiPakAudio = document.getElementById('opitaiPakAudio');

    // Игрални променливи
    let currentLevel = 0;
    let currentPortal = null;
    let slots = [];
    let choices = [];
    let correctAnswers = 0;

    // Инициализация
    async function initGame() {
        try {
            const [themes, portals] = await Promise.all([
                fetchData('themes.json'),
                fetchData('portals.json')
            ]);
            
            renderPortals(portals.portals);
            setupEventListeners();
        } catch (error) {
            console.error('Грешка при зареждане:', error);
            alert('Играта не можа да се зареди. Моля, опитайте по-късно.');
        }
    }

    async function fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Неуспешно зареждане: ${url}`);
        return await response.json();
    }

    function renderPortals(portals) {
        portalContainer.innerHTML = '';
        portals.forEach(portal => {
            const portalEl = document.createElement('div');
            portalEl.className = 'portal-card';
            portalEl.innerHTML = `
                <img src="${portal.icon}" alt="${portal.name}" class="portal-image">
                <div class="portal-name">${portal.name}</div>
            `;
            portalEl.addEventListener('click', () => startGame(portal));
            portalContainer.appendChild(portalEl);
        });
    }

    function startGame(portal) {
        currentPortal = portal;
        currentLevel = 0;
        startScreen.classList.remove('visible');
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        gameScreen.classList.add('visible');
        gameTitle.textContent = portal.name;
        loadLevel();
    }

    async function loadLevel() {
        try {
            const levelId = currentPortal.layouts[currentLevel];
            const levelData = await fetchData(`assets/layouts/${levelId}.json`);
            
            // Зареждане на фон
            gameBoard.style.backgroundImage = `url('${currentPortal.background}')`;
            
            // Изчистване на предишни елементи
            gameBoard.innerHTML = '';
            choiceZone.innerHTML = '';
            
            // Създаване на слотове
            slots = levelData.slots;
            slots.forEach(slot => {
                const slotEl = document.createElement('div');
                slotEl.className = 'slot';
                slotEl.style.width = slot.diameter;
                slotEl.style.height = slot.diameter;
                slotEl.style.top = slot.position.top;
                slotEl.style.left = slot.position.left;
                gameBoard.appendChild(slotEl);
            });
            
            // Генериране на избори
            choices = generateChoices(levelData);
            renderChoices();
            
        } catch (error) {
            console.error('Грешка при зареждане на ниво:', error);
        }
    }

    function generateChoices(levelData) {
        // Реализация на логиката за генериране на избори
        // ...
        return []; // Връща масив от обекти с {id, image}
    }

    function renderChoices() {
        choices.forEach(choice => {
            const choiceEl = document.createElement('img');
            choiceEl.src = choice.image;
            choiceEl.className = 'choice-item';
            choiceEl.dataset.id = choice.id;
            choiceEl.addEventListener('click', handleChoice);
            choiceZone.appendChild(choiceEl);
        });
    }

    function handleChoice(e) {
        // Логика за обработка на избора
        // ...
    }

    function setupEventListeners() {
        backToMenuBtn.addEventListener('click', () => {
            gameScreen.classList.remove('visible');
            gameScreen.classList.add('hidden');
            startScreen.classList.remove('hidden');
            startScreen.classList.add('visible');
        });
        
        playAgainBtn.addEventListener('click', () => {
            winScreen.classList.add('hidden');
            loadLevel();
        });
    }

    // Стартиране на играта
    initGame();
});
