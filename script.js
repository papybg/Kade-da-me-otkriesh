document.addEventListener('DOMContentLoaded', () => {
    // DOM Елементи
    const dropZoneEl = document.getElementById('dropZone');
    const choiceZoneEl = document.getElementById('choiceZone');
    const gameMessageEl = document.getElementById('gameMessage');
    const winScreenEl = document.getElementById('winScreen');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const startTurnBtn = document.getElementById('startTurnBtn');
    const highlighterEl = document.getElementById('slotHighlighter');
    const bodyEl = document.body;
    const bravoAudio = document.getElementById('bravoAudio');
    const opitaiPakAudio = document.getElementById('opitaiPakAudio');

    // Състояние на играта
    let allItems = [];
    let currentLevelData = {};
    let choicePool = [];
    let activeSlotData = null;
    let filledSlotsCount = 0;
    let isTurnActive = false;
    let availableSlots = [];

    // Функция за разбъркване
    function shuffleArray(array) {
        return [...array].sort(() => Math.random() - 0.5);
    }

    // Зареждане на ниво
    async function loadLevel(levelName) {
        const levelPath = `levels/${levelName}/`;
        const response = await fetch(`${levelPath}level.json`);
        currentLevelData = await response.json();

        if (!currentLevelData) {
            console.error(`Ниво '${levelName}' не е намерено.`);
            return;
        }

        // Нулиране
        filledSlotsCount = 0;
        isTurnActive = false;
        winScreenEl.classList.add('hidden');
        startTurnBtn.classList.remove('hidden');
        gameMessageEl.textContent = 'Натисни "СТАРТ", за да светне квадратче!';
        bodyEl.style.backgroundImage = `url('${levelPath}${currentLevelData.background}')`;
        dropZoneEl.innerHTML = '<div id="slotHighlighter" class="hidden"></div>'; 
        
        availableSlots = [...currentLevelData.slots];

        generateChoicePool();
        renderChoiceZone();
    }

    // Генериране на картинките за избор
    function generateChoicePool() {
        const correctItemsForLevel = new Set();
        currentLevelData.slots.forEach(slot => {
            const itemsForSlot = allItems.filter(item => item.index === slot.index);
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
    
    // Показване на картинките за избор
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
    
    // Начало на ход
    function startNewTurn() {
        if (isTurnActive) return;
        isTurnActive = true;
        startTurnBtn.classList.add('hidden');
        activateNextSlot();
    }

    // Активиране на следващия празен слот
    function activateNextSlot() {
        if (availableSlots.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableSlots.length);
            activeSlotData = availableSlots[randomIndex];
            
            const highlighter = document.getElementById('slotHighlighter');
            highlighter.style.top = activeSlotData.position.top;
            highlighter.style.left = activeSlotData.position.left;
            highlighter.classList.remove('hidden', 'active'); // Reset animation
            void highlighter.offsetWidth; // Force reflow
            highlighter.classList.add('active');

            gameMessageEl.textContent = 'Коя картинка е за тук?';
        }
    }

    // Клик върху картинка за избор
    function handleChoiceClick(chosenItem, chosenImgElement) {
        if (!isTurnActive || chosenImgElement.classList.contains('used')) return;

        if (chosenItem.index === activeSlotData.index) {
            isTurnActive = false;
            bravoAudio.play();
            
            const placedImg = document.createElement('img');
            placedImg.src = chosenItem.image;
            placedImg.alt = chosenItem.name;
            placedImg.classList.add('placed-image');
            placedImg.style.top = activeSlotData.position.top;
            placedImg.style.left = activeSlotData.position.left;
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
                gameMessageEl.textContent = 'Натисни "СТАРТ" за следващия квадрат!';
            }
        } else {
            opitaiPakAudio.play();
            gameMessageEl.textContent = 'Опитай пак!';
        }
    }

    // Основна функция
    async function initializeApp() {
        try {
            const response = await fetch('themes.json');
            allItems = (await response.json()).allItems;
            
            playAgainBtn.addEventListener('click', () => loadLevel('proba'));
            startTurnBtn.addEventListener('click', startNewTurn);

            loadLevel('proba'); // Зареждаме ниво 'proba' при старт
        } catch (error) {
            console.error("Неуспешно зареждане на данните:", error);
            document.body.innerHTML = `<h1 style="color:red">Грешка: Проверете файловете themes.json и levels.json!</h1>`;
        }
    }

    initializeApp();
});
