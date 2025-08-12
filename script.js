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
    let activeSlotData = null; // Вече пазим данните за слота, не самия елемент
    let filledSlotsCount = 0;
    let isTurnActive = false;
    let availableSlots = []; // Списък с незапълнените слотове

    // Функция за разбъркване
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Зареждане на ниво
    async function loadLevel(levelNumber) {
        const levelsResponse = await fetch('levels.json');
        const levels = await levelsResponse.json();
        currentLevelData = levels.find(l => l.level === levelNumber);

        if (!currentLevelData) { return; }

        filledSlotsCount = 0;
        isTurnActive = false;
        winScreenEl.classList.add('hidden');
        startTurnBtn.classList.remove('hidden');
        gameMessageEl.textContent = 'Натисни "СТАРТ", за да светне квадратче!';
        bodyEl.style.backgroundImage = `url('${currentLevelData.background}')`;
        dropZoneEl.innerHTML = '<div id="slotHighlighter" class="hidden"></div>'; // Изчистваме старите картинки и оставяме маркера
        
        availableSlots = [...currentLevelData.slots]; // Копираме слотовете за текущата игра

        generateChoicePool();
        renderChoiceZone();
    }

    // Генериране на картинките за избор
    function generateChoicePool() {
        const correctItemsForLevel = new Set();
        currentLevelData.slots.forEach(slot => {
            const itemsForSlot = allItems.filter(item => item.index === slot.index);
            if (itemsForSlot.length > 0) {
                const randomItem = itemsForSlot[Math.floor(Math.random() * itemsForSlot.length)];
                correctItemsForLevel.add(randomItem);
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
            // Взимаме случаен слот от оставащите
            const randomIndex = Math.floor(Math.random() * availableSlots.length);
            activeSlotData = availableSlots[randomIndex];
            
            // Позиционираме и показваме маркера
            const highlighter = document.getElementById('slotHighlighter');
            highlighter.style.top = activeSlotData.position.top;
            highlighter.style.left = activeSlotData.position.left;
            highlighter.classList.remove('hidden');

            gameMessageEl.textContent = 'Коя картинка е за тук?';
        }
    }

    // Клик върху картинка за избор
    function handleChoiceClick(chosenItem, chosenImgElement) {
        if (!isTurnActive || chosenImgElement.classList.contains('used')) return;

        if (chosenItem.index === activeSlotData.index) {
            // ПРАВИЛЕН ИЗБОР
            isTurnActive = false;
            bravoAudio.play();
            
            // Създаваме и позиционираме поставената картинка
            const placedImg = document.createElement('img');
            placedImg.src = chosenItem.image;
            placedImg.alt = chosenItem.name;
            placedImg.classList.add('placed-image');
            placedImg.style.top = activeSlotData.position.top;
            placedImg.style.left = activeSlotData.position.left;
            dropZoneEl.appendChild(placedImg);

            // Скриваме маркера
            document.getElementById('slotHighlighter').classList.add('hidden');
            
            // Маркираме използваната картинка
            chosenImgElement.classList.add('used');
            
            // Премахваме слота от списъка с достъпни
            availableSlots = availableSlots.filter(slot => slot !== activeSlotData);
            
            filledSlotsCount++;
            
            if (filledSlotsCount === currentLevelData.slots.length) {
                // ПОБЕДА
                setTimeout(() => {
                    winScreenEl.classList.remove('hidden');
                    gameMessageEl.textContent = 'Супер си!';
                }, 1000);
            } else {
                startTurnBtn.classList.remove('hidden');
                gameMessageEl.textContent = 'Натисни "СТАРТ" за следващия квадрат!';
            }
        } else {
            // ГРЕШЕН ИЗБОР
            opitaiPakAudio.play();
            gameMessageEl.textContent = 'Опитай пак!';
        }
    }

    // Основна функция
    async function initializeApp() {
        try {
            const response = await fetch('themes.json');
            allItems = (await response.json()).allItems;
            
            playAgainBtn.addEventListener('click', () => loadLevel(1));
            startTurnBtn.addEventListener('click', startNewTurn);

            loadLevel(1);
        } catch (error) {
            console.error("Неуспешно зареждане на данните:", error);
            document.body.innerHTML = `<h1 style="color:red">Грешка: Проверете файловете themes.json и levels.json!</h1>`;
        }
    }

    initializeApp();
});
