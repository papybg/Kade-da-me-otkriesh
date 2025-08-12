document.addEventListener('DOMContentLoaded', () => {
    // --- КОНФИГУРАЦИЯ ---
    const GAMES_TO_UNLOCK = 15;
    let ALL_THEMES = {};

    // --- DOM ЕЛЕМЕНТИ ---
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    const countRadios = document.querySelectorAll('input[name="count"]');
    const startGameBtn = document.getElementById('startGameBtn');
    const optionsContainer = document.getElementById('optionsContainer');
    const gameTitleEl = document.getElementById('gameTitle');
    const messageDisplay = document.getElementById('gameMessage');
    const startBtn = document.getElementById('start');
    const reloadBtn = document.getElementById('reload');
    const backToMenuBtn = document.getElementById('backToMenu');
    const allPicsEl = document.getElementById('allPics');
    const gamePicsEl = document.getElementById('gamePics');
    const containerEl = document.getElementById('container');
    const controlsEl = document.getElementById('controls');
    const birdsThemeRadio = document.getElementById('birdsThemeRadio');
    const birdsThemeLabel = document.getElementById('birdsThemeLabel');

    // --- СЪСТОЯНИЕ НА ИГРАТА ---
    const gameState = {
        currentThemeData: [],
        numberOfPics: 0,
        selectedGameItems: [],
        hiddenItem: null,
        awaitingChoice: false,
    };

    // --- АУДИО ---
    const bravoAudio = new Audio('audio/bravo_uily.wav');
    const opitaiPakAudio = new Audio('audio/opitaj_pak.wav');

    // --- ФУНКЦИИ ---
    function checkUnlockStatus() {
        const gamesPlayed = parseInt(localStorage.getItem('gamesPlayedCount')) || 0;
        if (gamesPlayed >= GAMES_TO_UNLOCK) {
            birdsThemeRadio.disabled = false;
            birdsThemeLabel.classList.remove('theme-locked', 'disabled-theme');
            birdsThemeLabel.title = `Изиграни игри: ${gamesPlayed}. Темата е отключена!`;
            birdsThemeLabel.innerHTML = birdsThemeLabel.innerHTML.replace('🔒', '✔️');
        } else {
            birdsThemeRadio.disabled = true;
            birdsThemeLabel.classList.add('theme-locked', 'disabled-theme');
            birdsThemeLabel.title = `Изиграни игри: ${gamesPlayed}/${GAMES_TO_UNLOCK}. Нужни са още ${GAMES_TO_UNLOCK - gamesPlayed}.`;
        }
    }

    function incrementGamesPlayed() {
        let gamesPlayed = parseInt(localStorage.getItem('gamesPlayedCount')) || 0;
        if (gamesPlayed < GAMES_TO_UNLOCK) {
            gamesPlayed++;
            localStorage.setItem('gamesPlayedCount', gamesPlayed);
            checkUnlockStatus();
            if (gamesPlayed === GAMES_TO_UNLOCK) {
                alert('Поздравления! Отключи нова тема: Птици!');
            }
        }
    }

    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    function updateCountOptionsAvailability() {
        const selectedThemeKey = document.querySelector('input[name="theme"]:checked')?.value;
        if (!selectedThemeKey || !ALL_THEMES[selectedThemeKey]) return;
        const maxPicsInTheme = ALL_THEMES[selectedThemeKey].length;
        countRadios.forEach(radio => {
            const label = radio.closest('label');
            if (parseInt(radio.value) > maxPicsInTheme) {
                radio.disabled = true;
                if(label) label.classList.add('disabled-theme');
            } else {
                radio.disabled = false;
                if(label) label.classList.remove('disabled-theme');
            }
        });
        const currentSelectedCount = document.querySelector('input[name="count"]:checked');
        if (currentSelectedCount && currentSelectedCount.disabled) {
            const lastEnabledRadio = [...countRadios].reverse().find(r => !r.disabled);
            if (lastEnabledRadio) lastEnabledRadio.checked = true;
        }
    }
    
    function updateStartButtonState() {
        const themeSelected = document.querySelector('input[name="theme"]:checked');
        const countSelected = document.querySelector('input[name="count"]:checked');
        startGameBtn.disabled = !(themeSelected && countSelected);
    }

    function startGame() {
        document.body.classList.remove('bg-menu');
        document.body.classList.add('bg-game');
        const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
        const themeLabel = document.querySelector(`input[value="${selectedTheme}"]`).closest('label');
        const themeDisplayName = themeLabel.textContent.replace(/🔒|✔️/g, '').trim();
        gameState.numberOfPics = parseInt(document.querySelector('input[name="count"]:checked').value);
        gameState.currentThemeData = ALL_THEMES[selectedTheme];
        gameTitleEl.innerHTML = `Познай<br>${themeDisplayName.toUpperCase()}!`;
        optionsContainer.classList.add('hidden');
        controlsEl.classList.remove('hidden');
        containerEl.classList.remove('hidden');
        renderGamePics();
        renderAllPics();
        resetGameState();
    }

    function renderAllPics() {
        allPicsEl.innerHTML = '';
        gameState.currentThemeData.forEach(item => {
            const img = document.createElement('img');
            img.src = item.image;
            img.dataset.id = item.id;
            img.alt = item.name;
            img.addEventListener('click', () => chooseHandler(item.id));
            allPicsEl.appendChild(img);
        });
    }

    function renderGamePics() {
        gamePicsEl.innerHTML = '';
        const shuffledItems = shuffleArray([...gameState.currentThemeData]);
        gameState.selectedGameItems = shuffledItems.slice(0, gameState.numberOfPics);
        gameState.selectedGameItems.forEach((item) => {
            const img = document.createElement('img');
            img.src = item.image;
            img.dataset.id = item.id;
            img.alt = item.name;
            gamePicsEl.appendChild(img);
        });
    }
    
    function hideRandomPicture() {
        if (gameState.awaitingChoice) return;
        restoreHiddenImage();
        const hiddenIndex = Math.floor(Math.random() * gameState.numberOfPics);
        const allGameImages = gamePicsEl.querySelectorAll('img');
        if (allGameImages.length === 0) return;
        const hiddenImageElement = allGameImages[hiddenIndex];
        gameState.hiddenItem = gameState.selectedGameItems[hiddenIndex];
        gameState.hiddenItem.element = hiddenImageElement;
        hiddenImageElement.src = 'images/hide.png';
        hiddenImageElement.alt = 'Скрита картинка';
        gameState.awaitingChoice = true;
        startBtn.classList.add('hidden');
        showMessage('Познай кое липсва!');
    }

    function chooseHandler(chosenId) {
        if (!gameState.awaitingChoice) return;
        const hiddenId = gameState.hiddenItem.id;
        if (chosenId === hiddenId) {
            restoreHiddenImage();
            const playBravo = () => {
                bravoAudio.currentTime = 0;
                bravoAudio.play().catch(err => console.error("Грешка при пускане на 'Браво':", err));
            };
            const itemSoundPath = gameState.hiddenItem.sound;
            if (itemSoundPath) {
                const itemSound = new Audio(itemSoundPath);
                itemSound.play().catch(err => {
                    console.error("Грешка при пускане на звук на обект:", err);
                    playBravo();
                });
                itemSound.onended = playBravo;
            } else {
                playBravo();
            }
            showMessage('Браво!', 'success');
            incrementGamesPlayed();
            gameState.awaitingChoice = false;
            reloadBtn.classList.remove('hidden');
            startBtn.classList.add('hidden');
        } else {
            opitaiPakAudio.currentTime = 0;
            opitaiPakAudio.play().catch(err => console.error("Грешка при пускане на 'Опитай пак':", err));
            showMessage('Опитай пак!', 'error');
        }
    }

    function showMessage(text, type = 'info') {
        messageDisplay.textContent = text;
        messageDisplay.classList.remove('message-hidden', 'message-success', 'message-error');
        messageDisplay.classList.add(`message-${type}`);
        messageDisplay.classList.add('message-animate');
    }

    function restoreHiddenImage() {
        if (gameState.hiddenItem && gameState.hiddenItem.element) {
            const el = gameState.hiddenItem.element;
            el.src = gameState.hiddenItem.image;
            el.alt = gameState.hiddenItem.name;
        }
    }

    function resetGameState() {
        restoreHiddenImage();
        gameState.awaitingChoice = false;
        gameState.hiddenItem = null;
        showMessage('Натисни "СКРИЙ КАРТИНА" за да започнеш.');
        reloadBtn.classList.add('hidden');
        startBtn.classList.remove('hidden');
    }

    function goBackToMenu() {
        document.body.classList.remove('bg-game');
        document.body.classList.add('bg-menu');
        gameTitleEl.innerHTML = 'Познай<br>КАРТИНКАТА!';
        controlsEl.classList.add('hidden');
        containerEl.classList.add('hidden');
        optionsContainer.classList.remove('hidden');
        messageDisplay.classList.remove('message-animate');
        messageDisplay.classList.add('message-hidden');
    }
    
    async function initializeApp() {
        document.body.classList.add('bg-menu');
        try {
            const response = await fetch('themes.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            ALL_THEMES = await response.json();
            themeRadios.forEach(r => r.addEventListener('change', () => {
                updateCountOptionsAvailability();
                setTimeout(updateStartButtonState, 50);
            }));
            countRadios.forEach(r => r.addEventListener('change', updateStartButtonState));
            startGameBtn.addEventListener('click', startGame);
            startBtn.addEventListener('click', hideRandomPicture);
            reloadBtn.addEventListener('click', startGame);
            backToMenuBtn.addEventListener('click', goBackToMenu);
            checkUnlockStatus();
            updateCountOptionsAvailability();
            updateStartButtonState();
        } catch (error) {
            console.error("Неуспешно зареждане или парсване на themes.json:", error);
            optionsContainer.innerHTML = `<p style="color: var(--error-color);">Грешка при зареждане на темите. Моля, проверете дали файлът 'themes.json' е наличен и синтактично коректен.</p>`;
        }
    }

    initializeApp();
});
