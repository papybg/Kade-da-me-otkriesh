document.addEventListener('DOMContentLoaded', () => {
    console.log("СКРИПТ: DOM е зареден. Започвам.");

    // --- ЕЛЕМЕНТИ ---
    const startScreenEl = document.getElementById('startScreen');
    const portalContainerEl = document.getElementById('portalContainer');
    // ... останалите елементи ...

    // --- СЪСТОЯНИЕ ---
    let allItems = [];
    // ... останалото състояние ...

    // --- ОСНОВНА ЛОГИКА ---
    async function initializeApp() {
        console.log("СКРИПТ: initializeApp() се изпълнява...");
        try {
            const [themesResponse, portalsResponse] = await Promise.all([
                fetch('themes.json'),
                fetch('portals.json')
            ]);

            console.log("СКРИПТ: Файловете са изтеглени.");

            if (!themesResponse.ok || !portalsResponse.ok) {
                throw new Error('Един от конфигурационните файлове не можа да бъде зареден.');
            }

            const themesData = await themesResponse.json();
            const portalsData = await portalsResponse.json();

            allItems = themesData.allItems;
            
            console.log("СКРИПТ: Данните са обработени. Подавам към renderPortals:", portalsData.portals);
            renderPortals(portalsData.portals);

            showStartScreen();
            console.log("СКРИПТ: Стартовият екран би трябвало да е показан.");

        } catch (error) {
            console.error("ГРЕШКА В initializeApp:", error);
            document.body.innerHTML = `<h1 style="color:red">Грешка при зареждане. Проверете конзолата!</h1>`;
        }
    }

    function renderPortals(portals) {
        console.log("СКРИПТ: renderPortals() се изпълнява...");
        if (!portalContainerEl) {
            console.error("ГРЕШКА: Не е намерен portalContainerEl!");
            return;
        }
        portalContainerEl.innerHTML = '';
        
        if (!portals || portals.length === 0) {
            console.warn("ВНИМАНИЕ: Масивът с портали е празен или невалиден.");
            return;
        }

        portals.forEach(portal => {
            console.log("СКРИПТ: Създавам портал за:", portal.name);
            const portalEl = document.createElement('div');
            portalEl.className = 'portal';
            portalEl.innerHTML = `
                <img src="${portal.icon}" alt="${portal.name}">
                <div class="portal-name">${portal.name}</div>
            `;
            portalEl.addEventListener('click', () => startGame(portal));
            portalContainerEl.appendChild(portalEl);
        });
        console.log("СКРИПТ: renderPortals() приключи.");
    }

    // ... останалите функции остават същите ...
    function startGame(portal) { /* ... */ }
    async function loadLayout(layoutId) { /* ... */ }
    function generateChoicePool(levelData) { /* ... */ }
    function renderChoiceZone(choicePool) { /* ... */ }
    function setupGameTurn(slots) { /* ... */ }
    function loadNextLayout() { /* ... */ }
    function showStartScreen() { /* ... */ }
    function showGameScreen() { /* ... */ }
    function toggleMute() { /* ... */ }
    
    // ... Event Listeners ...

    // --- Старт на приложението ---
    initializeApp();
});
