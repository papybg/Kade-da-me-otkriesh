document.addEventListener('DOMContentLoaded', () => {
    // DOM Елементи
    const dropZoneEl = document.getElementById('dropZone');
    const choiceZoneEl = document.getElementById('choiceZone');
    const gameMessageEl = document.getElementById('gameMessage');
    const winScreenEl = document.getElementById('winScreen');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const startTurnBtn = document.getElementById('startTurnBtn'); // НОВ бутон
    const bodyEl = document.body;
    const bravoAudio = document.getElementById('bravoAudio'); // НОВ начин за достъп
    const opitaiPakAudio = document.getElementById('opitaiPakAudio'); // НОВ начин за достъп


    // Състояние на играта
    let allItems = [];
    let currentLevelData = {};
    let choicePool = [];
    let activeDropSlot = null;
    let filledSlotsCount = 0;
    let isTurnActive = false; // НОВО: Следи дали има активен ход

    // Функция за разбъркване на масив
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

        if (!currentLevelData) {
            console.error(`Ниво ${levelNumber} не е намерено в levels.json`);
            return;
        }

        // Нулиране на състоянието
        filledSlotsCount = 0;
        isTurnActive = false;
        winScreenEl.classList.add('hidden');
        startTurnBtn.classList.remove('hidden');
        gameMessageEl.textContent = 'Натисни "СТАРТ", за да светне квадратче!';
        bodyEl.style.backgroundImage = `url('${currentLevelData.background}')`;

        // Създаване на горните слотове
        dropZoneEl.innerHTML = '';
        currentLevelData.slots.forEach((slotData, i) => {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.index = slotData.index;
            dropZoneEl.appendChild(slot);
        });

        // Генериране на избора долу
        generateChoicePool();
        renderChoiceZone();
    }

    function generateChoicePool() {
        const correctItemsForLevel = new Set();
        currentLevelData.slots.forEach(slot => {
            const itemsForSlot = allItems.filter(item => item.index === slot.index);
            if (itemsForSlot.length > 0) {
                // Тази логика трябва да се подобри, за да не избира дубликати
                // За сега ще работи за пробата
                const randomItem = itemsForSlot[Math.floor(Math.random() * itemsForSlot.length)];
                correctItemsForLevel.add(randomItem);
            }
        });

        const correctItemsArray = Array.from(correctItemsForLevel);
        const distractorItems = allItems.filter(item => 
            !correctItemsArray.some(correct => correct.id === item.id)
        );
        const shuffledDistractors = shuffleArray(distractorItems);
        const finalDistractors = shuffledDistractors.slice(0, currentLevelData.distractors);

        choicePool = shuffleArray([...correctItemsArray, ...finalDistractors]);
    }
    
    function renderChoiceZone() {
        choiceZoneEl.innerHTML = '';
        choicePool.forEach(item => {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            img.dataset.index = item.index;
            img.dataset.id = item.id;
            img.addEventListener('click', () => handleChoiceClick(item, img));
            choiceZoneEl.appendChild(img);
        });
    }
    
    // НОВА ФУНКЦИЯ: Започва нов ход
    function startNewTurn() {
        if(isTurnActive) return; // Предпазва от двойно натискане
        isTurnActive = true;
        startTurnBtn.classList.add('hidden');
        activateNextSlot();
    }

    function activateNextSlot() {
        if (activeDropSlot) {
            activeDropSlot.classList.remove('active');
        }
        
        const emptySlots = Array.from(dropZoneEl.children).filter(slot => !slot.classList.contains('filled'));
        
        if (emptySlots.length > 0) {
            activeDropSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
            activeDropSlot.classList.add('active');
            gameMessageEl.textContent = 'Коя картинка е за тук?';
        }
    }

    function handleChoiceClick(chosenItem, chosenImgElement) {
        if (!isTurnActive || chosenImgElement.classList.contains('used')) return;

        if (chosenItem.index === activeDropSlot.dataset.index) {
            // ПРАВИЛЕН ИЗБОР
            isTurnActive = false; // Деактивираме хода, докато тече анимацията
            bravoAudio.play();
            
            activeDropSlot.innerHTML = `<img src="${chosenItem.image}" alt="${chosenItem.name}">`;
            activeDropSlot.classList.add('filled');
            activeDropSlot.classList.remove('active');
            
            chosenImgElement.classList.add('used'); // "Почерняме" картинката
            
            filledSlotsCount++;
            
            if (filledSlotsCount === currentLevelData.slots.length) {
                // ПОБЕДА
                setTimeout(() => {
                    winScreenEl.classList.remove('hidden');
                    gameMessageEl.textContent = 'Супер си!';
                }, 1000);
            } else {
                // Подготвяме за следващия ход
                startTurnBtn.classList.remove('hidden');
                gameMessageEl.textContent = 'Натисни "СТАРТ" за следващия квадрат!';
            }

        } else {
            // ГРЕШЕН ИЗБОР
            opitaiPakAudio.play();
            gameMessageEl.textContent = 'Опитай пак!';
        }
    }

    // Основна функция за инициализация
    async function initializeApp() {
        try {
            const response = await fetch('themes.json');
            allItems = (await response.json()).allItems;
            
            playAgainBtn.addEventListener('click', () => loadLevel(1));
            startTurnBtn.addEventListener('click', startNewTurn); // Добавяме listener за новия бутон

            loadLevel(1);
        } catch (error) {
            console.error("Неуспешно зареждане на данните:", error);
            document.body.innerHTML = `<h1 style="color:red">Грешка при зареждане на играта. Проверете файловете themes.json и levels.json!</h1>`;
        }
    }

    initializeApp();
});
