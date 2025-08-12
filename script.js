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
        const levelsResponse = await fetch('levels.json');
        const levels = await levelsResponse.json();
        currentLevelData = levels.find(l => l.level === levelNumber);

        if (!currentLevelData) {
            console.error(`Ниво ${levelNumber} не е намерено в levels.json`);
            return;
        }

        filledSlotsCount = 0;
        winScreenEl.classList.add('hidden');
        bodyEl.style.backgroundImage = `url('${currentLevelData.background}')`;

        dropZoneEl.innerHTML = '';
        currentLevelData.slots.forEach((slotData, i) => {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.index = slotData.index;
            dropZoneEl.appendChild(slot);
        });

        generateChoicePool();
        renderChoiceZone();
        activateNextSlot();
    }

    function generateChoicePool() {
        const correctItems = new Set();
        currentLevelData.slots.forEach(slot => {
            const itemsForSlot = allItems.filter(item => item.index === slot.index);
            if (itemsForSlot.length > 0) {
                const randomItem = itemsForSlot[Math.floor(Math.random() * itemsForSlot.length)];
                correctItems.add(randomItem);
            }
        });

        const correctItemsArray = Array.from(correctItems);
        const distractorItems = allItems.filter(item => 
            !correctItemsArray.some(correct => correct.id === item.id)
        );
        const shuffledDistractors = shuffleArray(distractorItems);
        const finalDistractors = shuffledDistractors.slice(0, currentLevelData.distractors);

        choicePool = shuffleArray([...correctItemsArray, ...finalDistractors]);
    }
    
    // Показване на картинките за избор в лента
    function renderChoiceZone() {
        choiceZoneEl.innerHTML = '';
        choicePool.forEach(item => {
            // ПРОМЯНАТА Е ТУК: Създаваме директно <img>, а не <div>
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            img.dataset.index = item.index;
            img.dataset.id = item.id;
            img.addEventListener('click', () => handleChoiceClick(item, img));
            choiceZoneEl.appendChild(img);
        });
    }

    function activateNextSlot() {
        if (activeDropSlot) {
            activeDropSlot.classList.remove('active');
        }
        
        const emptySlots = Array.from(dropZoneEl.children).filter(slot => !slot.classList.contains('filled'));
        
        if (emptySlots.length > 0) {
            activeDropSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
            activeDropSlot.classList.add('active');
            gameMessageEl.textContent = 'Избери картинка за светещия квадрат!';
        } else {
             winScreenEl.classList.remove('hidden');
        }
    }

    function handleChoiceClick(chosenItem, chosenImgElement) {
        if (!activeDropSlot) return;

        if (chosenItem.index === activeDropSlot.dataset.index) {
            activeDropSlot.innerHTML = `<img src="${chosenItem.image}" alt="${chosenItem.name}">`;
            activeDropSlot.classList.add('filled');
            activeDropSlot.classList.remove('active');
            
            chosenImgElement.remove();
            
            filledSlotsCount++;
            
            if (filledSlotsCount === currentLevelData.slots.length) {
                setTimeout(() => {
                    winScreenEl.classList.remove('hidden');
                    gameMessageEl.textContent = 'Супер си!';
                }, 500);
            } else {
                activateNextSlot();
            }

        } else {
            gameMessageEl.textContent = 'Опитай пак!';
            chosenImgElement.style.animation = 'shake 0.5s';
            setTimeout(() => { chosenImgElement.style.animation = ''; }, 500);
        }
    }

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
