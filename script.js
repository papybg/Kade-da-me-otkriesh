document.addEventListener('DOMContentLoaded', () => {
    // --- ЕЛЕМЕНТИТЕ ОСТАВАТ СЪЩИТЕ ---

    // --- СЪСТОЯНИЕТО НА ИГРАТА ОСТАВА СЪЩОТО ---

    // --- ОСНОВНА ЛОГИКА ---

    async function initializeApp() {
        try {
            // ПРОМЯНА: Използваме Promise.all, за да сме сигурни,
            // че и двата файла са заредени преди да продължим.
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

    // ... останалият код в script.js остава същият ...
    
    function renderPortals(portals) { /* ... */ }
    function startGame(portal) { /* ... */ }
    async function loadLayout(layoutId) { /* ... */ }
    function generateChoicePool(levelData) { /* ... */ }
    function renderChoiceZone(choicePool) { /* ... */ }
    function setupGameTurn(slots) { /* ... */ }
    function loadNextLayout() { /* ... */ }
    function showStartScreen() { /* ... */ }
    function showGameScreen() { /* ... */ }
    function toggleMute() { /* ... */ }

    // --- Event Listeners ---
    // ...

    // --- Старт на приложението ---
    initializeApp();
    
    // --- Helper функция за разбъркване ---
    // ...
});
