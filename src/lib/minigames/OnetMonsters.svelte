<script>
    import { tick, onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';

    // --- Props ---
    let { 
        // Режим интеграции с визуальной новеллой
        integrated = false,
        // События для отправки результата
        onWin,
        onLose
    } = $props();

    const dispatch = createEventDispatcher();

    // --- Настройки ---
    const ROWS = 8;      // ← ИЗМЕНЕНО: было 6, стало 8
    const COLS = 6;      // ← ИЗМЕНЕНО: было 8, стало 6
    const ICONS = [
        '🦄', '🦇', '👻', '💀', '🔥', '🕷️', '🕸️', 
        '🧟', '🧙‍♀️', '⚰️', '🐸', '🦴', '🔮', '🧪', 
        '👹', '🌜', '🍭', '💗', '🌛', '🖤', '🗡️', 
        '🧛‍♀️', '🗝️', '🕯️', '🌑', '☠️', '🧿', '🌞'
    ];

    // --- State (Runes) ---
    let board = $state([]); // 2D массив иконок
    let matched = $state([]); // 2D массив булевых (удалена ли плитка)
    let shuffling = $state({}); // Объект для отслеживания анимации тряски {"r,c": true}
    let hintCells = $state([]); // Массив координат для подсказки [{r, c}, {r, c}]
    
    let firstSelected = $state(null); // {r, c}
    let isProcessing = $state(false);
    let isGameOver = $state(false);
    
    let linePath = $state([]); // Координаты для SVG линии
    let lineKey = $state(0); // Ключ для перерисовки SVG и рестарта анимации

    // Cooldown для подсказки (в секундах)
    let hintCooldown = $state(0); // Оставшееся время cooldown
    const HINT_COOLDOWN_TIME = 5; // 5 секунд cooldown

    // Modal State
    let modal = $state({
        show: false,
        title: '',
        text: '',
        actions: []
    });

    // Refs
    let gridContainer;
    let gridEl;

    // Инициализация при монтировании
    onMount(() => {
        initGame();
    });

    // --- Вычисляемые свойства ---
    function getRemainingCount() {
        if (!matched || matched.length === 0) return 0;
        let count = 0;
        for(let r=0; r<ROWS; r++) {
            for(let c=0; c<COLS; c++) {
                if (matched[r] && !matched[r][c]) count++;
            }
        }
        return count;
    }

    let remainingCount = $derived(getRemainingCount());

    // Проверка доступности подсказки
    let isHintAvailable = $derived(hintCooldown === 0);

    // --- Инициализация ---
    function initGame() {
        board = [];
        matched = [];
        firstSelected = null;
        isProcessing = false;
        isGameOver = false;
        shuffling = {};
        hintCells = [];
        linePath = [];
        hintCooldown = 0;
        hideModal();

        // Подготовка колоды
        let uniqueIcons = [...new Set(ICONS)];
        while (uniqueIcons.length < (ROWS * COLS) / 2) {
            uniqueIcons = [...uniqueIcons, ...uniqueIcons];
        }
        
        let selectedIcons = uniqueIcons.sort(() => 0.5 - Math.random()).slice(0, (ROWS * COLS) / 2);
        let deck = [];
        selectedIcons.forEach(icon => deck.push(icon, icon));
        deck.sort(() => Math.random() - 0.5);

        // Заполнение сетки
        let index = 0;
        for (let r = 0; r < ROWS; r++) {
            let rowBoard = [];
            let rowMatched = [];
            for (let c = 0; c < COLS; c++) {
                rowBoard.push(deck[index++]);
                rowMatched.push(false);
            }
            board.push(rowBoard);
            matched.push(rowMatched);
        }

        // Проверка ходов с небольшой задержкой
        setTimeout(checkGameStatus, 500);
    }

    // --- Логика игры ---
    async function handleCellClick(r, c) {
        if (isProcessing || matched[r][c] || isGameOver) return;

        // Сброс подсказки при клике
        if (hintCells.length > 0) hintCells = [];

        if (!firstSelected) {
            firstSelected = { r, c };
            return;
        }

        if (firstSelected.r === r && firstSelected.c === c) {
            firstSelected = null;
            return;
        }

        const icon1 = board[firstSelected.r][firstSelected.c];
        const icon2 = board[r][c];

        if (icon1 === icon2) {
            const path = findPath(firstSelected.r, firstSelected.c, r, c);
            if (path) {
                isProcessing = true;
                await drawLine(path);
                // Анимация завершена, удаляем плитки
                matched[firstSelected.r][firstSelected.c] = true;
                matched[r][c] = true;
                firstSelected = null;
                isProcessing = false;
                // Запускаем cooldown для подсказки после успешного хода
                startHintCooldown();
                checkGameStatus();
                return;
            }
        }

        // Неправильный выбор
        firstSelected = { r, c };
    }

    async function handleCellKeyDown(r, c, event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            await handleCellClick(r, c);
        }
    }

    // --- Подсказки ---
    function startHintCooldown() {
        hintCooldown = HINT_COOLDOWN_TIME;
        const timer = setInterval(() => {
            hintCooldown--;
            if (hintCooldown <= 0) {
                clearInterval(timer);
            }
        }, 1000);
    }

    function showHint() {
        if (isProcessing || isGameOver || !isHintAvailable) return;

        // Логика поиска такая же, как в hasAvailableMoves, но возвращаем пару
        let remainingTiles = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!matched[r][c]) {
                    remainingTiles.push({ r, c, icon: board[r][c] });
                }
            }
        }

        let groups = {};
        remainingTiles.forEach(tile => {
            if (!groups[tile.icon]) groups[tile.icon] = [];
            groups[tile.icon].push(tile);
        });

        for (let icon in groups) {
            let tiles = groups[icon];
            if (tiles.length < 2) continue;

            for (let i = 0; i < tiles.length; i++) {
                for (let j = i + 1; j < tiles.length; j++) {
                    let t1 = tiles[i];
                    let t2 = tiles[j];
                    if (findPath(t1.r, t1.c, t2.r, t2.c)) {
                        hintCells = [t1, t2];
                        setTimeout(() => hintCells = [], 1500);
                        return;
                    }
                }
            }
        }
        showModal("Нет ходов", "Не нашлось пар для соединения.", [{text: "ОК", action: hideModal}]);
    }

    // --- Статус игры ---
    function checkGameStatus() {
        if (remainingCount === 0) {
            isGameOver = true;

            if (integrated) {
                // В интегрированном режиме отправляем событие победы
                if (onWin) {
                    onWin();
                } else {
                    dispatch('win');
                }
            } else {
                // В автономном режиме показываем модальное окно
                showModal("🎉 Победа!", "Все монстры пойманы!", [
                    { text: "Играть снова", action: initGame }
                ]);
            }
            return;
        }

        if (!hasAvailableMoves()) {
            if (integrated) {
                // В интегрированном режиме автоматически перемешиваем
                setTimeout(() => shuffleBoard(), 1000);
            } else {
                showModal("😨 Тупик!", "Ходов больше нет. Перемешать?", [
                    { text: "Перемешать", action: () => { hideModal(); shuffleBoard(); } },
                    { text: "Сдаться", action: () => { showModal("Конец", "Попытайте удачу снова!", [{text: "ОК", action: initGame}]); } }
                ]);
            }
        }
    }

    function hasAvailableMoves() {
        let remainingTiles = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!matched[r][c]) remainingTiles.push({ r, c, icon: board[r][c] });
            }
        }

        let groups = {};
        remainingTiles.forEach(tile => {
            if (!groups[tile.icon]) groups[tile.icon] = [];
            groups[tile.icon].push(tile);
        });

        for (let icon in groups) {
            let tiles = groups[icon];
            if (tiles.length < 2) continue;
            for (let i = 0; i < tiles.length; i++) {
                for (let j = i + 1; j < tiles.length; j++) {
                    if (findPath(tiles[i].r, tiles[i].c, tiles[j].r, tiles[j].c)) return true;
                }
            }
        }
        return false;
    }

    // --- Перемешивание ---
    function shuffleBoard() {
        let remainingIcons = [];
        let remainingPositions = [];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!matched[r][c]) {
                    remainingIcons.push(board[r][c]);
                    remainingPositions.push({ r, c });
                }
            }
        }

        if (remainingIcons.length === 0) return;
        remainingIcons.sort(() => Math.random() - 0.5);

        // Обновляем доску
        remainingPositions.forEach((pos, index) => {
            board[pos.r][pos.c] = remainingIcons[index];
            // Запускаем анимацию тряски
            shuffling[`${pos.r},${pos.c}`] = true;
        });

        // Убираем класс тряски через 500мс
        setTimeout(() => {
            shuffling = {};
            
            // Рекурсивная проверка
            if (!hasAvailableMoves()) {
                shuffleBoard();
            } else {
                isGameOver = false;
            }
        }, 500);
    }

    // --- Pathfinding (Логика пути) ---
    function isEmpty(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
        return matched[r][c];
    }

    function checkLine(r1, c1, r2, c2) {
        if (r1 !== r2 && c1 !== c2) return false;
        if (r1 === r2) {
            const minC = Math.min(c1, c2);
            const maxC = Math.max(c1, c2);
            for (let c = minC + 1; c < maxC; c++) {
                if (!isEmpty(r1, c)) return false;
            }
        } else {
            const minR = Math.min(r1, r2);
            const maxR = Math.max(r1, r2);
            for (let r = minR + 1; r < maxR; r++) {
                if (!isEmpty(r, c1)) return false;
            }
        }
        return true;
    }

    function findPath(r1, c1, r2, c2) {
        // 0 поворотов
        if (checkLine(r1, c1, r2, c2)) return [{r:r1, c:c1}, {r:r2, c:c2}];

        // 1 поворот
        let c1_r1_c2 = {r: r1, c: c2};
        if (isEmpty(c1_r1_c2.r, c1_r1_c2.c) && checkLine(r1, c1, c1_r1_c2.r, c1_r1_c2.c) && checkLine(c1_r1_c2.r, c1_r1_c2.c, r2, c2)) {
            return [{r:r1, c:c1}, c1_r1_c2, {r:r2, c:c2}];
        }

        let c1_r2_c1 = {r: r2, c: c1};
        if (isEmpty(c1_r2_c1.r, c1_r2_c1.c) && checkLine(r1, c1, c1_r2_c1.r, c1_r2_c1.c) && checkLine(c1_r2_c1.r, c1_r2_c1.c, r2, c2)) {
            return [{r:r1, c:c1}, c1_r2_c1, {r:r2, c:c2}];
        }

        // 2 поворота
        for (let r = -1; r <= ROWS; r++) {
            if (r === r1 || r === r2) continue;
            let p1 = {r: r, c: c1};
            let p2 = {r: r, c: c2};
            if (isEmpty(p1.r, p1.c) && isEmpty(p2.r, p2.c) && checkLine(r1, c1, p1.r, p1.c) && checkLine(p1.r, p1.c, p2.r, p2.c) && checkLine(p2.r, p2.c, r2, c2)) {
                return [{r:r1, c:c1}, p1, p2, {r:r2, c:c2}];
            }
        }

        for (let c = -1; c <= COLS; c++) {
            if (c === c1 || c === c2) continue;
            let p1 = {r: r1, c: c};
            let p2 = {r: r2, c: c};
            if (isEmpty(p1.r, p1.c) && isEmpty(p2.r, p2.c) && checkLine(r1, c1, p1.r, p1.c) && checkLine(p1.r, p1.c, p2.r, p2.c) && checkLine(p2.r, p2.c, r2, c2)) {
                return [{r:r1, c:c1}, p1, p2, {r:r2, c:c2}];
            }
        }

        return null;
    }

    // --- Отрисовка линии ---
    async function drawLine(path) {
        // Ждем обновления DOM перед измерением координат
        await tick();

        if (!gridContainer || !gridEl) return;

        const containerRect = gridContainer.getBoundingClientRect();
        const gridRect = gridEl.getBoundingClientRect();

        // Для вычисления "виртуальных" точек (за пределами сетки)
        const baseCell = gridEl.querySelector('.cell'); // Первая доступная ячейка для замера размеров
        if (!baseCell) return;

        const cellW = baseCell.offsetWidth;
        const cellH = baseCell.offsetHeight;
        const style = window.getComputedStyle(gridEl);
        const gap = parseFloat(style.gap) || 4;

        const offsetX = gridRect.left - containerRect.left;
        const offsetY = gridRect.top - containerRect.top;

        const points = path.map(p => {
            let x, y;
            if (p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS) {
                // Реальная ячейка
                // Используем nth-child или querySelector для поиска конкретной ячейки
                // В Svelte структура DOM стабильна, но безопаснее найти по data-атрибутам или индексам
                // Но querySelector внутри gridEl с селектором по nth-child сложен для 2D.
                // Проще: gridEl.children[p.r * COLS + p.c]
                const cell = gridEl.children[p.r * COLS + p.c];
                const rect = cell.getBoundingClientRect();
                x = (rect.left - containerRect.left) + (rect.width / 2);
                y = (rect.top - containerRect.top) + (rect.height / 2);
            } else {
                // Виртуальная точка
                const xRel = p.c * (cellW + gap) + cellW / 2;
                const yRel = p.r * (cellH + gap) + cellH / 2;
                x = offsetX + xRel;
                y = offsetY + yRel;
            }
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        linePath = points;
        lineKey++; // Изменяем ключ, чтобы пересоздать элемент и запустить CSS анимацию
        
        return new Promise(resolve => {
            setTimeout(() => {
                linePath = [];
                resolve();
            }, 350);
        });
    }

    // --- Modal Helpers ---
    function showModal(title, text, actions) {
        // В интегрированном режиме не показываем модальные окна
        if (integrated) return;
        modal = { show: true, title, text, actions };
    }

    function hideModal() {
        modal.show = false;
    }

    function handleGiveUp() {
        if (integrated) {
            if (onLose) {
                onLose();
            } else {
                dispatch('lose');
            }
        } else {
            showModal("Конец", "Попытайте удачу снова!", [{text: "ОК", action: initGame}]);
        }
    }
</script>

<div class="body-wrapper">
    <div id="game-header">
    <!-- <div class="header-left"> -->
        <button class="btn btn-secondary" onclick={initGame}>🔄 Новая игра</button>
        {#if integrated}
            <button class="btn btn-danger" onclick={handleGiveUp}>🏳️ Сдаться</button>
        {/if}
    <!-- </div>-->
     </div> 
    <div id="game-header">
        <!-- <div class="header-left"> -->
            <span class="tiles-counter">Осталось: <strong>{remainingCount}</strong></span>
            <button
                class="btn btn-secondary"
                class:disabled={!isHintAvailable}
                class:cooldown-active={hintCooldown > 0}
                onclick={showHint}
                disabled={!isHintAvailable}
            >
                💡 Подсказка
                {#if hintCooldown > 0}
                    <span class="cooldown-timer">({hintCooldown})</span>
                {/if}
            </button>
        <!-- </div> -->
    </div>

    <div id="game-container" bind:this={gridContainer}>
        <div id="grid" bind:this={gridEl} style="grid-template-columns: repeat({COLS}, 1fr); grid-template-rows: repeat({ROWS}, 1fr);">
            {#each board as row, r (r)}
                {#each row as icon, c (c)}
                    <div 
                        class="cell"
                        class:selected={firstSelected?.r === r && firstSelected?.c === c}
                        class:matched={matched[r][c]}
                        class:shuffling={shuffling[`${r},${c}`]}
                        class:hint-glow={hintCells.some(h => h.r === r && h.c === c)}
                        onclick={() => handleCellClick(r, c)}
                        onkeydown={(e) => handleCellKeyDown(r, c, e)}
                        role="button"
                        tabindex="0"
                    >
                        {icon}
                    </div>
                {/each}
            {/each}
        </div>
        
        <svg id="line-layer">
            {#key lineKey}
                {#if linePath}
                    <polyline 
                        points={linePath} 
                        class="connection-line" 
                        vector-effect="non-scaling-stroke"
                    />
                {/if}
            {/key}
        </svg>
    </div>
</div>

<!-- Модальное окно -->
{#if modal.show}
    <div id="modal-overlay" class:active={modal.show}>
        <div class="modal-content">
            <div class="modal-title">{modal.title}</div>
            <div class="modal-text">{modal.text}</div>
            <div class="modal-buttons">
                {#each modal.actions as action (action.text)}
                    <button 
                        class="btn" 
                        class:btn-secondary={action.class === 'btn-secondary'}
                        onclick={action.action}
                    >
                        {action.text}
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    :global(body) {
        margin: 0;
        background-color: #120f1a;
        background-image: radial-gradient(circle at center, #2a2a40 0%, #120f1a 100%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #ececec;
        overflow: hidden;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .body-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        user-select: none;
    }

    #game-header {
        margin-bottom: 20px;
        width: 100%;
        max-width: 400px;
        display: flex;
        justify-content: space-around;
        align-items: center;
        padding: 10px 15px;
        margin-bottom: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 30px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(5px);
        z-index: 10;
    }

    .header-left {
        /* display: flex; */
        /* align-items: center; */
        /* gap: 20px; */
    }

    .tiles-counter {
        font-size: 1rem;
        color: #ececec;
    }

    .tiles-counter strong {
        color: #ff9f43;
        font-size: 1.2rem;
    }

    /* .header-right {
        display: flex;
        gap: 8px;
    } */

    #game-container {
        position: relative;
        background-color: rgba(0, 0, 0, 0.5);
        padding: 5px;
        border-radius: 15px;
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    #grid {
        display: grid;
        gap: 4px;
        position: relative;
        z-index: 1;
        width: fit-content;
        height: fit-content;
    }

    .cell {
        width: 11vmin;
        height: 11vmin;
        max-width: 60px;
        max-height: 60px;
        background-color: #3d3b5c;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(20px, 5vmin, 32px);
        cursor: pointer;
        border: 2px solid transparent;
        box-shadow: 0 4px 0 rgba(0,0,0,0.3);
        transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                    background-color 0.2s, 
                    box-shadow 0.2s;
        position: relative;
    }

    @media (min-width: 800px) {
        .cell {
            width: 60px;
            height: 60px;
        }
    }
    @media (max-width: 390px) {
        .cell {
            width: 45px;
            height: 45px;
        }
    }

    .cell:hover {
        transform: translateY(-4px);
        background-color: #4e4c75;
        z-index: 10;
        box-shadow: 0 8px 0 rgba(0,0,0,0.4);
    }

    .cell.selected {
        background-color: #e94560;
        color: white;
        transform: scale(1.1) translateY(-2px);
        box-shadow: 0 0 20px rgba(233, 69, 96, 0.8);
        z-index: 20;
        border-color: #fff;
    }

    .cell.matched {
        visibility: hidden;
        opacity: 0;
        pointer-events: none;
    }

    .cell.shuffling {
        animation: shake 0.4s ease-in-out;
        filter: brightness(1.5);
        border-color: rgba(255, 255, 255, 0.5);
        /* Фон остается темным (#3d3b5c), цвет меняется только через filter */
    }

    .cell.hint-glow {
        animation: pulse-hint 1s infinite;
        border-color: #ffd700;
        box-shadow: 0 0 15px #ffd700, inset 0 0 10px #ffd700;
        z-index: 15;
        filter: brightness(1.3);
    }

    @keyframes shake {
        0%, 100% { transform: translate(0, 0) rotate(0); }
        25% { transform: translate(-3px, 3px) rotate(-3deg); }
        50% { transform: translate(3px, -3px) rotate(3deg); }
        75% { transform: translate(-3px, -3px) rotate(-3deg); }
    }

    @keyframes pulse-hint {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
    }

    #line-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 5;
        overflow: visible;
    }

    .connection-line {
        stroke: #ff9f43;
        stroke-width: 6px;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 5px #ff9f43);
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        animation: dash 0.3s ease-out forwards;
    }

    @keyframes dash {
        to { stroke-dashoffset: 0; }
    }

    .btn {
        padding: 8px 20px;
        font-size: 13px;
        background: linear-gradient(135deg, #e94560, #c0394d);
        color: white;
        border: none;
        border-radius: 25px;
        cursor: pointer;
        transition: transform 0.1s, box-shadow 0.2s, filter 0.2s;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        box-shadow: 0 4px 10px rgba(233, 69, 96, 0.4);
        white-space: nowrap;
    }

    .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(233, 69, 96, 0.6);
        filter: brightness(1.1);
    }

    .btn:active {
        transform: translateY(1px);
    }
    
    .btn-secondary {
        background: linear-gradient(135deg, #4e4c75, #3d3b5c);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
    }

    .btn-danger {
        background: linear-gradient(135deg, #c0392b, #e74c3c);
        box-shadow: 0 4px 10px rgba(192, 57, 43, 0.4);
    }

    .btn-danger:hover {
        box-shadow: 0 6px 15px rgba(192, 57, 43, 0.6);
    }

    .btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
        filter: grayscale(0.5);
    }

    .btn.disabled:hover {
        transform: none !important;
        box-shadow: 0 4px 10px rgba(233, 69, 96, 0.4);
    }

    .cooldown-active {
        position: relative;
    }

    .cooldown-timer {
        font-size: 0.9em;
        margin-left: 5px;
        color: #ffd700;
        font-weight: bold;
    }

    #modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
    }

    #modal-overlay.active {
        opacity: 1;
        pointer-events: all;
    }

    .modal-content {
        background: #252338;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        border: 2px solid #5e5c8a;
        box-shadow: 0 0 30px rgba(0,0,0,0.8);
        max-width: 90%;
        width: 400px;
        transform: scale(0.8);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    #modal-overlay.active .modal-content {
        transform: scale(1);
    }

    .modal-title {
        font-size: 2rem;
        margin-bottom: 10px;
        color: #ff9f43;
    }

    .modal-text {
        margin-bottom: 30px;
        font-size: 1.1rem;
        line-height: 1.5;
        color: #ccc;
    }

    .modal-buttons {
        display: flex;
        gap: 15px;
        justify-content: center;
        flex-wrap: wrap;
    }
</style>