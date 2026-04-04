// State Management
let state = {
    tasks: [],
    karma: 0,
    level: 1,
    streak: 0,
    lastCompletedDate: null,
    timer: {
        timeLeft: 1500, // 25 minutes
        isRunning: false,
        isDeepWork: false,
        interval: null
    }
};

// Selectors
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const energySelect = document.getElementById('energy-select');
const karmaDisplay = document.getElementById('karma-count');
const levelDisplay = document.getElementById('level-display');
const streakDisplay = document.getElementById('streak-count');
const timerDisplay = document.getElementById('timer-display');
const overlayTimer = document.getElementById('overlay-timer');
const startTimerBtn = document.getElementById('start-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const deepWorkOverlay = document.getElementById('deep-work-overlay');
const exitDeepWorkBtn = document.getElementById('exit-deep-work');
const greetingText = document.getElementById('greeting-text');
const currentDateDisplay = document.getElementById('current-date');

// Initialization
function init() {
    loadState();
    renderTasks();
    updateUI();
    setupEventListeners();
    updateGreeting();
}

// Event Listeners
function setupEventListeners() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.getAttribute('data-view');
            switchView(viewName);
        });
    });

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    startTimerBtn.addEventListener('click', toggleTimer);
    resetTimerBtn.addEventListener('click', resetTimer);
    exitDeepWorkBtn.addEventListener('click', () => {
        state.timer.isDeepWork = false;
        deepWorkOverlay.classList.add('hidden');
    });
}

// Navigation
function switchView(viewName) {
    views.forEach(v => v.classList.remove('active'));
    navItems.forEach(i => i.classList.remove('active'));

    document.getElementById(`${viewName}-view`).classList.add('active');
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    if (viewName === 'matrix') renderMatrix();
}

// Task Logic
function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    const newTask = {
        id: Date.now(),
        text: text,
        energy: energySelect.value,
        completed: false,
        createdAt: new Date().toISOString()
    };

    state.tasks.unshift(newTask);
    taskInput.value = '';
    saveState();
    renderTasks();
    
    // Karma for adding a task (minor bonus)
    updateKarma(5);
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    
    if (task.completed) {
        let points = 20;
        if (task.energy === 'medium') points = 40;
        if (task.energy === 'high') points = 80;
        updateKarma(points);
        checkStreak();
    } else {
        updateKarma(-20);
    }

    saveState();
    renderTasks();
}

function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    renderTasks();
}

// Rendering
function renderTasks() {
    taskList.innerHTML = '';
    state.tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item glass ${task.completed ? 'completed' : ''}`;
        taskElement.innerHTML = `
            <div class="task-info">
                <div class="checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})">
                    <i data-lucide="check"></i>
                </div>
                <div>
                   <div class="task-text">${task.text}</div>
                   <span class="energy-tag energy-${task.energy}">${task.energy}</span>
                </div>
            </div>
            <button class="btn-delete" onclick="deleteTask(${task.id})">
                <i data-lucide="trash-2" style="width: 18px; color: var(--text-muted);"></i>
            </button>
        `;
        taskList.appendChild(taskElement);
    });
    lucide.createIcons();
}

function renderMatrix() {
    const quadrants = {
        'urgent-important': document.getElementById('urgent-important').querySelector('.matrix-tasks'),
        'not-urgent-important': document.getElementById('not-urgent-important').querySelector('.matrix-tasks'),
        'urgent-not-important': document.getElementById('urgent-not-important').querySelector('.matrix-tasks'),
        'not-urgent-not-important': document.getElementById('not-urgent-not-important').querySelector('.matrix-tasks')
    };

    // Reset quadrants
    Object.values(quadrants).forEach(q => q.innerHTML = '');

    state.tasks.filter(t => !t.completed).forEach(task => {
        // Simple heuristic for matrix placement based on energy for demo
        // High Energy -> Urgent/Important
        // Medium Energy -> Not Urgent/Important
        // Low Energy -> Urgent/Not Important
        let quadrantId = 'not-urgent-not-important';
        if (task.energy === 'high') quadrantId = 'urgent-important';
        else if (task.energy === 'medium') quadrantId = 'not-urgent-important';
        else if (task.energy === 'low') quadrantId = 'urgent-not-important';

        const taskEl = document.createElement('div');
        taskEl.className = 'matrix-task-item';
        taskEl.textContent = task.text;
        quadrants[quadrantId].appendChild(taskEl);
    });
}

// Timer Logic
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function toggleTimer() {
    if (state.timer.isRunning) {
        clearInterval(state.timer.interval);
        state.timer.isRunning = false;
        startTimerBtn.textContent = 'Start Focus';
    } else {
        state.timer.isRunning = true;
        startTimerBtn.textContent = 'Pause Focus';
        state.timer.isDeepWork = true;
        deepWorkOverlay.classList.remove('hidden');
        
        state.timer.interval = setInterval(() => {
            state.timer.timeLeft--;
            const timeStr = formatTime(state.timer.timeLeft);
            timerDisplay.textContent = timeStr;
            overlayTimer.textContent = timeStr;

            if (state.timer.timeLeft <= 0) {
                clearInterval(state.timer.interval);
                state.timer.isRunning = false;
                state.timer.timeLeft = 1500;
                state.timer.isDeepWork = false;
                deepWorkOverlay.classList.add('hidden');
                alert('Session complete! Take a break.');
                updateKarma(150); // Big bonus for deep work
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(state.timer.interval);
    state.timer.timeLeft = 1500;
    state.timer.isRunning = false;
    state.timer.isDeepWork = false;
    startTimerBtn.textContent = 'Start Focus';
    timerDisplay.textContent = "25:00";
    overlayTimer.textContent = "25:00";
    deepWorkOverlay.classList.add('hidden');
}

// Gamification Logic
function updateKarma(points) {
    state.karma += points;
    if (state.karma < 0) state.karma = 0;
    
    // Level calc: Level 1 (0), Level 2 (500), Level 3 (1200), Level 4 (2500)...
    const newLevel = Math.floor(Math.sqrt(state.karma / 50)) + 1;
    if (newLevel > state.level) {
        state.level = newLevel;
        // Animation or notification for level up could go here
    }
    
    updateUI();
    saveState();
}

function checkStreak() {
    const today = new Date().toDateString();
    if (state.lastCompletedDate !== today) {
        state.streak++;
        state.lastCompletedDate = today;
    }
}

// UI Helpers
function updateUI() {
    karmaDisplay.textContent = state.karma.toLocaleString();
    levelDisplay.textContent = state.level;
    streakDisplay.textContent = state.streak;
}

function updateGreeting() {
    const hour = new Date().getHours();
    let msg = "Focus, you've got this.";
    if (hour < 12) msg = "Good morning. High energy only.";
    else if (hour < 18) msg = "Good afternoon. Keep the momentum.";
    else msg = "Good evening. Close out strong.";
    
    greetingText.textContent = msg;
    currentDateDisplay.textContent = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric' 
    });
}

// State Persistence
function saveState() {
    const dataToSave = { ...state };
    delete dataToSave.timer; // Don't save transient timer state
    localStorage.setItem('zenTaskState', JSON.stringify(dataToSave));
}

function loadState() {
    const saved = localStorage.getItem('zenTaskState');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
    }
}

// Start
init();
