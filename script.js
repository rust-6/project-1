import { 
    auth, db, onAuthStateChanged, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
    doc, onSnapshot, setDoc, updateDoc, collection, serverTimestamp 
} from "./firebase-config.js";

// State Management
let state = {
    tasks: [],
    karma: 0,
    level: 1,
    streak: 0,
    lastCompletedDate: null,
    timer: {
        timeLeft: 1500,
        isRunning: false,
        isDeepWork: false,
        interval: null
    }
};

let userDocRef = null;
let isSignUpMode = false;

// Selectors
const appContainer = document.querySelector('.app-container');
const authContainer = document.getElementById('auth-container');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitchBtn = document.getElementById('auth-switch-btn');
const authSwitchText = document.getElementById('auth-switch-text');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const appLoading = document.getElementById('app-loading');
const nameGroup = document.getElementById('name-group');
const authName = document.getElementById('auth-name');
const togglePassword = document.getElementById('toggle-password');
const userDisplayName = document.getElementById('user-display-name');
const greetingTime = document.getElementById('greeting-time');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');

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

let unsubscribeSync = null;

// Initialization
function init() {
    // Show loading initially
    appLoading.classList.remove('hidden');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            showAppMode();
            setupSync(user.uid);
        } else {
            cleanupSync();
            resetState();
            showAuthMode();
            // Hide loading if not logged in
            appLoading.classList.add('hidden');
        }
    });

    setupEventListeners();
    updateGreeting();
}

function setLoading(isLoading) {
    if (isLoading) {
        authSubmitBtn.disabled = true;
        authSubmitBtn.querySelector('span').textContent = isSignUpMode ? "Creating..." : "Signing In...";
    } else {
        authSubmitBtn.disabled = false;
        authSubmitBtn.querySelector('span').textContent = isSignUpMode ? "Sign Up" : "Sign In";
    }
}

function resetState() {
    state = {
        tasks: [],
        karma: 0,
        level: 1,
        streak: 0,
        lastCompletedDate: null,
        timer: {
            timeLeft: 1500,
            isRunning: false,
            isDeepWork: false,
            interval: null
        }
    };
}

function showAppMode() {
    document.body.classList.remove('auth-mode');
    document.body.classList.add('app-mode');
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function showAuthMode() {
    document.body.classList.remove('app-mode');
    document.body.classList.add('auth-mode');
    appContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

// Sync with Firestore
function setupSync(uid) {
    cleanupSync();
    userDocRef = doc(db, "users", uid);

    unsubscribeSync = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            state = { 
                ...state, 
                tasks: data.tasks || [],
                karma: data.karma || 0,
                level: data.level || 1,
                streak: data.streak || 0,
                lastCompletedDate: data.lastCompletedDate || null
            };
            
            if (data.displayName) {
                userDisplayName.textContent = data.displayName.split(' ')[0];
            } else {
                userDisplayName.textContent = "friend";
            }

            renderTasks();
            updateUI();
            if (document.getElementById('matrix-view').classList.contains('active')) {
                renderMatrix();
            }
        } else {
            saveToFirebase();
        }
        // Hide loading after first sync
        appLoading.classList.add('hidden');
    }, (error) => {
        console.error("Sync error:", error);
        appLoading.classList.add('hidden');
    });
}

function cleanupSync() {
    if (unsubscribeSync) {
        unsubscribeSync();
        unsubscribeSync = null;
    }
}

function saveToFirebase() {
    if (!userDocRef) return;
    const dataToSave = {
        tasks: state.tasks,
        karma: state.karma,
        level: state.level,
        streak: state.streak,
        lastCompletedDate: state.lastCompletedDate,
        updatedAt: serverTimestamp()
    };
    setDoc(userDocRef, dataToSave, { merge: true }).catch(err => console.error("Firebase save error:", err));
}

// Event Listeners
function setupEventListeners() {
    // Auth Listeners
    authSwitchBtn.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        authTitle.textContent = isSignUpMode ? "Create Account" : "Welcome Back";
        authSubtitle.textContent = isSignUpMode ? "Start your journey to mastery." : "Focus is a habit. Let's cultivate it.";
        authSubmitBtn.querySelector('span').textContent = isSignUpMode ? "Sign Up" : "Sign In";
        authSwitchText.textContent = isSignUpMode ? "Already have an account?" : "Don't have an account?";
        authSwitchBtn.textContent = isSignUpMode ? "Sign In" : "Create Account";
        
        if (isSignUpMode) {
            nameGroup.classList.remove('hidden');
            authName.required = true;
        } else {
            nameGroup.classList.add('hidden');
            authName.required = false;
        }
        
        authError.classList.add('hidden');
    });

    togglePassword.addEventListener('click', () => {
        const type = authPassword.type === 'password' ? 'text' : 'password';
        authPassword.type = type;
        togglePassword.querySelector('i').setAttribute('data-lucide', type === 'password' ? 'eye' : 'eye-off');
        lucide.createIcons();
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = authEmail.value;
        const password = authPassword.value;
        const name = authName.value;
        
        authError.classList.add('hidden');
        setLoading(true);

        const authAction = isSignUpMode ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
        
        authAction(auth, email, password)
            .then((userCredential) => {
                if (isSignUpMode && name) {
                    // Update display name in Firestore
                    const user = userCredential.user;
                    const docRef = doc(db, "users", user.uid);
                    setDoc(docRef, { displayName: name }, { merge: true });
                }
            })
            .catch(err => {
                let msg = err.message;
                if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
                if (err.code === 'auth/email-already-in-use') msg = "This email is already registered.";
                if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
                
                authError.textContent = msg;
                authError.classList.remove('hidden');
                setLoading(false);
            });
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth).catch(err => console.error("Logout error:", err));
    });

    // App Listeners
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.classList.contains('logout-item')) return;
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

function switchView(viewName) {
    views.forEach(v => v.classList.remove('active'));
    navItems.forEach(i => i.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    if (viewName === 'matrix') renderMatrix();
}

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
    saveToFirebase();
    updateKarma(5);
}

window.addMatrixTask = (quadrantId) => {
    const text = prompt('Enter task name:');
    if (!text || !text.trim()) return;

    const energyMap = {
        'urgent-important': 'high',
        'not-urgent-important': 'medium',
        'urgent-not-important': 'low',
        'not-urgent-not-important': 'low'
    };

    const newTask = {
        id: Date.now(),
        text: text.trim(),
        energy: energyMap[quadrantId],
        quadrant: quadrantId,
        completed: false,
        createdAt: new Date().toISOString()
    };

    state.tasks.unshift(newTask);
    saveToFirebase();
    updateKarma(5);
};

window.toggleTask = (id) => {
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
    saveToFirebase();
};

window.deleteTask = (id) => {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveToFirebase();
};

function renderTasks() {
    if (!taskList) return;
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
    if (window.lucide) lucide.createIcons();
}

function renderMatrix() {
    const quadrantIds = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
    quadrantIds.forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        let tasksDiv = container.querySelector('.matrix-tasks');
        if (!tasksDiv) return;
        tasksDiv.innerHTML = '';
        const addBtn = document.createElement('button');
        addBtn.className = 'matrix-add-btn';
        addBtn.innerHTML = '+ Add Task';
        addBtn.style.cssText = `background: rgba(255,255,255,0.08); border: 1px dashed rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; margin-bottom: 8px; width: 100%;`;
        addBtn.onclick = () => window.addMatrixTask(id);
        tasksDiv.appendChild(addBtn);
        state.tasks.filter(t => !t.completed && (t.quadrant === id || (!t.quadrant && ((id === 'urgent-important' && t.energy === 'high') || (id === 'not-urgent-important' && t.energy === 'medium') || (id === 'urgent-not-important' && t.energy === 'low'))))).forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'matrix-task-item';
            taskEl.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 4px 0;`;
            taskEl.innerHTML = `<span onclick="toggleTask(${task.id})" style="cursor:pointer;flex:1">${task.text}</span><span onclick="deleteTask(${task.id})" style="cursor:pointer;color:rgba(255,100,100,0.6);margin-left:8px;font-size:0.8rem">✕</span>`;
            tasksDiv.appendChild(taskEl);
        });
    });
}

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
                updateKarma(150);
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

function updateKarma(points) {
    state.karma += points;
    if (state.karma < 0) state.karma = 0;
    const newLevel = Math.floor(Math.sqrt(state.karma / 50)) + 1;
    if (newLevel > state.level) state.level = newLevel;
    updateUI();
    saveToFirebase();
}

function checkStreak() {
    const today = new Date().toDateString();
    if (state.lastCompletedDate !== today) {
        state.streak++;
        state.lastCompletedDate = today;
    }
}

function updateUI() {
    if (karmaDisplay) karmaDisplay.textContent = state.karma.toLocaleString();
    if (levelDisplay) levelDisplay.textContent = state.level;
    if (streakDisplay) streakDisplay.textContent = state.streak;
}

function updateGreeting() {
    const hour = new Date().getHours();
    let timeMsg = "Focus";
    if (hour < 12) timeMsg = "Good morning";
    else if (hour < 18) timeMsg = "Good afternoon";
    else timeMsg = "Good evening";
    
    if (greetingTime) greetingTime.textContent = timeMsg;
    if (currentDateDisplay) currentDateDisplay.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

init();