document.addEventListener('DOMContentLoaded', () => {
    // DOM Елементи
    const dropZoneEl = document.getElementById('dropZone');
    const choiceZoneEl = document.getElementById('choiceZone');
    const gameMessageEl = document.getElementById('gameMessage');
    const winScreenEl = document.getElementById('winScreen');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const bodyEl = document.body;

    // Състояние на играта
    let allItems = [];
    let currentLevelData = {};
    let choicePool = [];
    let activeDropSlot = null;
    let filledSlotsCount = 0;

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
        // Зареждане на всички нива
        const levelsResponse = await fetch('levels.json');
        const levels = await levelsResponse.json();
        currentLevelData = levels.find(l => l.level === levelNumber);

        if (!currentLevelData) {
            console.error(`Ниво ${levelNumber} не е намерено в levels.json`);
            return;
        }

        // Нулиране
        filledSlotsCount = 0;
        winScreenEl.classList.add('hidden');
        bodyEl.style.backgroundImage = `url('${currentLevelData.background}')`;

        // 1. Създаваме горните слотове
        dropZoneEl.innerHTML = '';
        currentLevelData.slots.forEach((slotData, i) => {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.index = slotData.index;
            slot.dataset.id = `drop-${i}`;
            dropZoneEl.appendChild(slot);
        });

        // 2. Генерираме избора долу
        generateChoicePool();
        renderChoiceZone();

        // 3. Започваме първия ход
        activateNextSlot();
    }

    // Генериране на картинките за избор
    function generateChoicePool() {
        // Взимаме всички ПРАВИЛНИ картинки за нивото
        const correctItems = [];
        currentLevelData.slots.forEach(slot => {
            const itemsForSlot = allItems.filter(item => item.index === slot.index);
            if (itemsForSlot.length > 0) {
                const randomItem = itemsForSlot[Math.floor(Math.random() * itemsForSlot.length)];
                correctItems.push(randomItem);
            }
        });

        // Взимаме РАЗСЕЙВАЩИ картинки
        const distractorItems = allItems.filter(item => 
            !correctItems.some(correct => correct.id === item.id)
        );
        const shuffledDistractors = shuffleArray(distractorItems);
        const finalDistractors = shuffledDistractors.slice(0, currentLevelData.distractors);

        // Обединяваме и разбъркваме
        choicePool = shuffleArray([...correctItems, ...finalDistractors]);
    }
    
    // Показване на картинките за избор
    function renderChoiceZone() {
        choiceZoneEl.innerHTML = '';
        choicePool.forEach(item => {
            const slot = document.createElement('div');
            slot.classList.add('slot', 'choice-slot');
            slot.dataset.index = item.index;
            slot.dataset.id = item.id;
            
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            slot.appendChild(img);

            slot.addEventListener('click', () => handleChoiceClick(item, slot));
            choiceZoneEl.appendChild(slot);
        });
    }

    // Активиране на следващия празен слот горе
    function activateNextSlot() {
        if (activeDropSlot) {
            activeDropSlot.classList.remove('active');
        }
        
        const emptySlots = Array.from(dropZoneEl.children).filter(slot => !slot.classList.contains('filled'));
        
        if (emptySlots.length > 0) {
            activeDropSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
            activeDropSlot.classList.add('active');
            gameMessageEl.textContent = 'Къде трябва да отиде тази картинка?';
        } else {
             // Няма повече празни слотове = Победа!
             winScreenEl.classList.remove('hidden');
        }
    }

    // При клик на картинка отдолу
    function handleChoiceClick(chosenItem, chosenSlotElement) {
        if (!activeDropSlot) return;

        // Проверка дали индексът на картинката съвпада с индекса на активния слот
        if (chosenItem.index === activeDropSlot.dataset.index) {
            // ПРАВИЛЕН ИЗБОР
            activeDropSlot.innerHTML = `<img src="${chosenItem.image}" alt="${chosenItem.name}">`;
            activeDropSlot.classList.add('filled');
            activeDropSlot.classList.remove('active');

            chosenSlotElement.remove(); // Премахваме картинката от избора
            
            filledSlotsCount++;
            
            // Проверка за победа
            if (filledSlotsCount === currentLevelData.slots.length) {
                winScreenEl.classList.remove('hidden');
                gameMessageEl.textContent = 'Супер си!';
            } else {
                activateNextSlot(); // Активираме следващия празен слот
            }

        } else {
            // ГРЕШЕН ИЗБОР
            gameMessageEl.textContent = 'Опитай пак!';
            // Може да добавим лека анимация за грешка
            chosenSlotElement.style.animation = 'shake 0.5s';
            setTimeout(() => { chosenSlotElement.style.animation = ''; }, 500);
        }
    }

    // Основна функция за инициализация
    async function initializeApp() {
        try {
            const response = await fetch('themes.json');
            allItems = (await response.json()).allItems;
            playAgainBtn.addEventListener('click', () => loadLevel(1));
            loadLevel(1);
        } catch (error) {
            console.error("Неуспешно зареждане на данните:", error);
            document.body.innerHTML = `<h1 style="color:red">Грешка при зареждане на играта. Проверете файловете themes.json и levels.json!</h1>`;
        }
    }

    initializeApp();
});
