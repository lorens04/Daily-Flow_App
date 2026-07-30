// ==========================================================================
// DAILYFLOW - STANDALONE JS (100% BULLETPROOF & NULL-SAFE)
// ==========================================================================

// State Utama & Pengaturan default
const STORAGE_KEY = 'dailyflow_tasks_v1';
const THEME_KEY = 'dailyflow_theme_v1';
const SOUND_KEY = 'dailyflow_sound_v1';

// Daftar Rutinitas Harian Cepat (Quick Habits)
const DEFAULT_QUICK_HABITS = [
    { title: '💧 Minum Air Putih 2L', category: 'Kesehatan', priority: 'Sedang', time: '08:00' },
    { title: '🏃 Olahraga / Jalan Pagi 30 Mnt', category: 'Kesehatan', priority: 'Sedang', time: '06:30' },
    { title: '🛏️ Rapikan Tempat Tidur & Kamar', category: 'Rumah', priority: 'Santai', time: '07:00' },
    { title: '🎯 Fokus Kerja / Tugas 2 Jam', category: 'Kerja', priority: 'Tinggi', time: '09:00' },
    { title: '📖 Baca Buku / Artikel 15 Mnt', category: 'Belajar', priority: 'Santai', time: '20:00' },
    { title: '🛒 Cek & Belanja Keperluan Dapur', category: 'Belanja', priority: 'Sedang', time: '16:00' }
];

// Daftar Kutipan Inspiratif Harian
const DAILY_QUOTES = [
    '"Setiap langkah kecil yang kamu selesaikan hari ini membawamu lebih dekat ke target besarmu."',
    '"Fokus pada apa yang bisa kamu kerjakan hari ini, jangan biarkan tumpukan tugas menakutimu."',
    '"Konsistensi adalah kunci. Sedikit demi sedikit lama-lama menjadi bukit."',
    '"Mulai harimu dengan senyuman dan selesaikan tugas paling penting terlebih dahulu!"',
    '"Waktu terbaik untuk memulai adalah sekarang. Yuk selesaikan satu per satu!"',
    '"Keseimbangan kerja dan istirahat adalah rahasia produktif yang sejati."'
];

// Aplikasi State
let tasks = [];
let currentFilter = 'all';
let currentCategory = 'all';
let currentSort = 'created-desc';
let searchQuery = '';
let isSoundEnabled = true;
let recentlyDeletedTask = null;
let undoTimeoutId = null;

// Audio Synthesizer via Web Audio API (Tanpa file eksternal)
let audioCtx = null;
function playSound(type = 'check') {
    if (!isSoundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'check') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);       // C5
            osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.14); // G5
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'uncheck') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);           // A4
            osc.frequency.setValueAtTime(329.63, now + 0.08); // E4
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'add') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, now); // D5
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        } else if (type === 'celebrate') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);        // C5
            osc.frequency.setValueAtTime(659.25, now + 0.1);  // E5
            osc.frequency.setValueAtTime(783.99, now + 0.2);  // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
            osc.start(now);
            osc.stop(now + 0.75);
        }
    } catch (e) {
        // Abaikan jika browser memblokir autohandler sound
    }
}

// ==========================================
// Inisialisasi Aplikasi Saat Halaman Dimuat
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSound();
    loadTasks();
    initClock();
    initGreeting();
    renderQuickHabits();
    setupEventListeners();
    setupPillsSelectors();
    updateUI();
});

// ==========================================
// 1. Tanggal, Jam & Sapaan Otomatis
// ==========================================
function initClock() {
    const timeEl = document.getElementById('live-time');
    const dateEl = document.getElementById('live-date');
    if (!timeEl || !dateEl) return;

    function updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeEl.textContent = `${hours}:${minutes}:${seconds}`;

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const dayName = days[now.getDay()];
        const dateNum = now.getDate();
        const monthName = months[now.getMonth()];
        const year = now.getFullYear();

        dateEl.textContent = `${dayName}, ${dateNum} ${monthName} ${year}`;
    }

    updateTime();
    setInterval(updateTime, 1000);
}

function initGreeting() {
    const titleEl = document.getElementById('greeting-title');
    const badgeEl = document.getElementById('greeting-badge');
    const quoteEl = document.getElementById('quote-text');

    const hour = new Date().getHours();
    let greeting = 'Halo, Selamat Pagi! 🌅';
    let badge = 'Semangat Pagi';

    if (hour >= 11 && hour < 15) {
        greeting = 'Halo, Selamat Siang! ☀️';
        badge = 'Fokus Siang';
    } else if (hour >= 15 && hour < 18) {
        greeting = 'Halo, Selamat Sore! 🌤️';
        badge = 'Produktif Sore';
    } else if (hour >= 18 || hour < 4) {
        greeting = 'Halo, Selamat Malam! 🌙';
        badge = 'Istirahat & Evaluasi';
    }

    if (titleEl) titleEl.textContent = greeting;
    if (badgeEl) badgeEl.textContent = badge;

    const quoteIndex = new Date().getDate() % DAILY_QUOTES.length;
    if (quoteEl) quoteEl.textContent = DAILY_QUOTES[quoteIndex];
}

// ==========================================
// 2. Tema Dark Mode & Suara (INSTANT 0ms)
// ==========================================
function initTheme() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    if (!themeBtn || !themeIcon) return;

    const savedTheme = localStorage.getItem(THEME_KEY);
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        themeIcon.className = 'fa-solid fa-sun';
        themeIcon.style.color = '#f59e0b';
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        themeIcon.className = 'fa-solid fa-moon';
        themeIcon.style.color = '';
    }

    themeBtn.addEventListener('click', () => {
        const darkActive = document.documentElement.classList.toggle('dark');
        document.body.classList.toggle('dark', darkActive);
        if (darkActive) {
            localStorage.setItem(THEME_KEY, 'dark');
            themeIcon.className = 'fa-solid fa-sun';
            themeIcon.style.color = '#f59e0b';
            showToast('Mode Gelap (Navy) diaktifkan 🌙');
        } else {
            localStorage.setItem(THEME_KEY, 'light');
            themeIcon.className = 'fa-solid fa-moon';
            themeIcon.style.color = '';
            showToast('Mode Terang diaktifkan ☀️');
        }
    });
}

function initSound() {
    const soundBtn = document.getElementById('toggle-sound-btn');
    const soundIcon = document.getElementById('sound-icon');
    if (!soundBtn || !soundIcon) return;

    const savedSound = localStorage.getItem(SOUND_KEY);
    if (savedSound === 'off') {
        isSoundEnabled = false;
        soundIcon.className = 'fa-solid fa-volume-xmark';
    }

    soundBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
            localStorage.setItem(SOUND_KEY, 'on');
            soundIcon.className = 'fa-solid fa-volume-high';
            playSound('add');
            showToast('Efek suara diaktifkan 🔊');
        } else {
            localStorage.setItem(SOUND_KEY, 'off');
            soundIcon.className = 'fa-solid fa-volume-xmark';
            showToast('Efek suara dimatikan 🔇');
        }
    });
}

// ==========================================
// 3. Penyimpanan Data LocalStorage
// ==========================================
function loadTasks() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            tasks = JSON.parse(saved);
        } catch (e) {
            tasks = [];
        }
    } else {
        tasks = [
            {
                id: 'init-1',
                title: '💧 Minum Air Putih 2L untuk menjaga kesegaran tubuh',
                category: 'Kesehatan',
                priority: 'Sedang',
                time: '08:30',
                note: 'Bawa botol air minum saat bekerja',
                completed: false,
                createdAt: Date.now() - 3600000
            },
            {
                id: 'init-2',
                title: '🎯 Selesaikan tugas utama keseharian hari ini',
                category: 'Kerja',
                priority: 'Tinggi',
                time: '14:00',
                note: 'Fokus tanpa gangguan selama 90 menit',
                completed: false,
                createdAt: Date.now() - 1800000
            },
            {
                id: 'init-3',
                title: '📖 Baca bab buku pilihan sebelum tidur',
                category: 'Belajar',
                priority: 'Santai',
                time: '21:00',
                note: '',
                completed: true,
                createdAt: Date.now() - 900000
            }
        ];
        saveTasks();
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ==========================================
// 4. Manajemen Tugas (CRUD)
// ==========================================
function addTask(title, category, priority, time, note = '') {
    const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: title.trim(),
        category,
        priority,
        time: time || '',
        note: note.trim(),
        completed: false,
        createdAt: Date.now()
    };

    tasks.unshift(newTask);
    saveTasks();
    updateUI();
    playSound('add');
    showToast('Tugas baru berhasil ditambahkan! ✨', 'success');
}

function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks();
    updateUI();

    if (task.completed) {
        playSound('check');
        const allCompleted = tasks.length > 0 && tasks.every(t => t.completed);
        if (allCompleted) {
            triggerConfetti();
            playSound('celebrate');
            showToast('Luar biasa! Semua tugasmu hari ini selesai! 🎉🏆', 'success');
        } else {
            showToast('Tugas diselesaikan! Bagus sekali! 👍');
        }
    } else {
        playSound('uncheck');
    }
}

function deleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;

    recentlyDeletedTask = {
        task: { ...tasks[index] },
        index: index
    };

    tasks.splice(index, 1);
    saveTasks();
    updateUI();
    playSound('uncheck');

    showUndoToast('Tugas telah dihapus', () => {
        if (recentlyDeletedTask) {
            tasks.splice(recentlyDeletedTask.index, 0, recentlyDeletedTask.task);
            recentlyDeletedTask = null;
            saveTasks();
            updateUI();
            playSound('add');
            showToast('Penghapusan dibatalkan (Undo)', 'info');
        }
    });
}

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const idEl = document.getElementById('edit-id');
    const titleEl = document.getElementById('edit-title');
    const categoryEl = document.getElementById('edit-category');
    const priorityEl = document.getElementById('edit-priority');
    const timeEl = document.getElementById('edit-time');
    const noteEl = document.getElementById('edit-note');

    if (idEl) idEl.value = task.id;
    if (titleEl) titleEl.value = task.title;
    if (categoryEl) categoryEl.value = task.category;
    if (priorityEl) priorityEl.value = task.priority;
    if (timeEl) timeEl.value = task.time || '';
    if (noteEl) noteEl.value = task.note || '';

    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function saveEditedTask(id, newTitle, newCategory, newPriority, newTime, newNote) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.title = newTitle.trim();
    task.category = newCategory;
    task.priority = newPriority;
    task.time = newTime;
    task.note = newNote.trim();

    saveTasks();
    updateUI();
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    showToast('Tugas berhasil diperbarui! ✅', 'success');
}

// ==========================================
// 5. Rutinitas Cepat (Quick Habits)
// ==========================================
function renderQuickHabits() {
    const container = document.getElementById('quick-habits-container');
    if (!container) return;
    container.innerHTML = '';

    DEFAULT_QUICK_HABITS.forEach(habit => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'habit-chip';
        btn.innerHTML = `
            <span>${escapeHtml(habit.title)}</span>
            <i class="fa-solid fa-plus" style="font-size: 11px; color: #2563eb;"></i>
        `;

        btn.addEventListener('click', () => {
            const alreadyExists = tasks.some(t => t.title.toLowerCase() === habit.title.toLowerCase() && !t.completed);
            if (alreadyExists) {
                showToast('Rutinitas ini sudah ada dalam daftar tugas aktifmu.', 'info');
                return;
            }
            addTask(habit.title, habit.category, habit.priority, habit.time);
        });

        container.appendChild(btn);
    });
}

// ==========================================
// 6. Filter, Cari & Sorting
// ==========================================
function getFilteredAndSortedTasks() {
    return tasks
        .filter(task => {
            if (currentFilter === 'active' && task.completed) return false;
            if (currentFilter === 'completed' && !task.completed) return false;
            if (currentCategory !== 'all' && task.category !== currentCategory) return false;

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchTitle = task.title.toLowerCase().includes(query);
                const matchNote = (task.note || '').toLowerCase().includes(query);
                const matchCategory = task.category.toLowerCase().includes(query);
                if (!matchTitle && !matchNote && !matchCategory) return false;
            }

            return true;
        })
        .sort((a, b) => {
            if (currentSort === 'priority') {
                const priorityWeight = { 'Tinggi': 3, 'Sedang': 2, 'Santai': 1 };
                if (priorityWeight[b.priority] !== priorityWeight[a.priority]) {
                    return priorityWeight[b.priority] - priorityWeight[a.priority];
                }
                return b.createdAt - a.createdAt;
            } else if (currentSort === 'time') {
                if (!a.time && b.time) return 1;
                if (a.time && !b.time) return -1;
                if (a.time && b.time && a.time !== b.time) {
                    return a.time.localeCompare(b.time);
                }
                return b.createdAt - a.createdAt;
            } else {
                return b.createdAt - a.createdAt;
            }
        });
}

// ==========================================
// 7. Render UI & Progres Harian
// ==========================================
function updateUI() {
    renderTasksList();
    updateProgressAndStats();
    updateFilterButtons();
}

function renderTasksList() {
    const listSection = document.getElementById('task-list-section');
    const emptyState = document.getElementById('empty-state');
    if (!listSection || !emptyState) return;

    const filteredTasks = getFilteredAndSortedTasks();

    listSection.innerHTML = '';

    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.classList.add('hidden');
        emptyState.style.display = 'none';
    }

    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${task.completed ? 'completed-task' : ''}`;

        // Category Badges class mapping
        const catBadgeMap = {
            'Kerja': 'badge-kerja',
            'Rumah': 'badge-rumah',
            'Kesehatan': 'badge-kesehatan',
            'Belajar': 'badge-belajar',
            'Belanja': 'badge-belanja'
        };
        const badgeClass = catBadgeMap[task.category] || 'badge-kerja';

        // Priority Badges class mapping
        const prioBadgeMap = {
            'Tinggi': 'badge-prio-tinggi',
            'Sedang': 'badge-prio-sedang',
            'Santai': 'badge-prio-santai'
        };
        const priorityClass = prioBadgeMap[task.priority] || '';

        card.innerHTML = `
            <div class="task-left">
                <button type="button" 
                        onclick="toggleTaskComplete('${task.id}')"
                        class="custom-checkbox ${task.completed ? 'checked' : ''}">
                    <i class="fa-solid fa-check" style="font-size: 11px;"></i>
                </button>

                <div class="task-content">
                    <p class="task-title-text">${escapeHtml(task.title)}</p>

                    <div class="task-badges-row">
                        <span class="badge-tag ${badgeClass}">
                            ${task.category}
                        </span>

                        <span class="badge-tag ${priorityClass}">
                            ${task.priority}
                        </span>

                        ${task.time ? `
                            <span class="badge-tag badge-time">
                                <i class="fa-solid fa-clock" style="font-size: 10px;"></i>
                                <span>${task.time} WIB</span>
                            </span>
                        ` : ''}
                    </div>

                    ${task.note ? `
                        <div class="task-note-box">
                            <i class="fa-solid fa-file-lines" style="color: #64748b; margin-right: 4px;"></i>
                            <span>${escapeHtml(task.note)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="task-actions">
                <button type="button"
                        onclick="openEditModal('${task.id}')"
                        title="Edit Tugas"
                        class="action-btn">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button"
                        onclick="deleteTask('${task.id}')"
                        title="Hapus Tugas"
                        class="action-btn delete-btn">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;

        listSection.appendChild(card);
    });
}

function updateProgressAndStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const highPriority = tasks.filter(t => !t.completed && t.priority === 'Tinggi').length;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    const percentageEl = document.getElementById('progress-percentage');
    const textEl = document.getElementById('progress-text');
    const subtextEl = document.getElementById('progress-subtext');
    const progressBarFill = document.getElementById('progress-bar-fill');

    if (percentageEl) percentageEl.textContent = `${percentage}%`;
    if (textEl) textEl.textContent = `${completed} / ${total} Tugas Selesai`;

    if (subtextEl) {
        if (total === 0) {
            subtextEl.textContent = 'Yuk, tambahkan tugas pertama kamu!';
        } else if (percentage === 100) {
            subtextEl.textContent = 'Semua tugas hari ini tuntas! Hebat! 🎉';
        } else if (percentage >= 50) {
            subtextEl.textContent = 'Sudah lebih dari separuh jalan, semangat! 🔥';
        } else {
            subtextEl.textContent = 'Ayo mulai selesaikan satu per satu! 💪';
        }
    }

    if (progressBarFill) {
        progressBarFill.style.width = `${percentage}%`;
    }

    const statActive = document.getElementById('stat-active');
    const statCompleted = document.getElementById('stat-completed');
    const statHigh = document.getElementById('stat-high-priority');

    if (statActive) statActive.textContent = active;
    if (statCompleted) statCompleted.textContent = completed;
    if (statHigh) statHigh.textContent = highPriority;

    const countAll = document.getElementById('count-all');
    const countActive = document.getElementById('count-active');
    const countCompleted = document.getElementById('count-completed');

    if (countAll) countAll.textContent = total;
    if (countActive) countActive.textContent = active;
    if (countCompleted) countCompleted.textContent = completed;
}

function updateFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        const filterVal = btn.getAttribute('data-filter');
        if (filterVal === currentFilter) {
            btn.className = 'filter-btn active';
        } else {
            btn.className = 'filter-btn';
        }
    });
}

// ==========================================
// 8. Event Listeners Lengkap & Interaktif Pills
// ==========================================
function setupPillsSelectors() {
    const catPills = document.querySelectorAll('.cat-pill');
    const hiddenCategory = document.getElementById('task-category');

    catPills.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            if (hiddenCategory) hiddenCategory.value = val;

            catPills.forEach(p => p.className = 'pill-btn cat-pill');
            btn.className = 'pill-btn cat-pill active-pill';
        });
    });

    const prioPills = document.querySelectorAll('.prio-pill');
    const hiddenPriority = document.getElementById('task-priority');

    prioPills.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            if (hiddenPriority) hiddenPriority.value = val;

            prioPills.forEach(p => {
                const pVal = p.getAttribute('data-val');
                p.className = 'pill-btn prio-pill';
                if (pVal === 'Sedang') p.classList.add('prio-sedang');
                if (pVal === 'Tinggi') p.classList.add('prio-tinggi');
            });

            btn.className = 'pill-btn prio-pill active-pill';
            if (val === 'Sedang') btn.classList.add('prio-sedang');
            if (val === 'Tinggi') btn.classList.add('prio-tinggi');
        });
    });
}

function resetFormPillsToDefault() {
    const catPills = document.querySelectorAll('.cat-pill');
    const hiddenCategory = document.getElementById('task-category');
    if (hiddenCategory) hiddenCategory.value = 'Kerja';

    catPills.forEach(p => {
        const val = p.getAttribute('data-val');
        if (val === 'Kerja') {
            p.className = 'pill-btn cat-pill active-pill';
        } else {
            p.className = 'pill-btn cat-pill';
        }
    });

    const prioPills = document.querySelectorAll('.prio-pill');
    const hiddenPriority = document.getElementById('task-priority');
    if (hiddenPriority) hiddenPriority.value = 'Sedang';

    prioPills.forEach(p => {
        const val = p.getAttribute('data-val');
        if (val === 'Sedang') {
            p.className = 'pill-btn prio-pill prio-sedang active-pill';
        } else {
            p.className = 'pill-btn prio-pill';
            if (val === 'Tinggi') p.classList.add('prio-tinggi');
        }
    });
}

function setupEventListeners() {
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('task-input');
            const categoryInput = document.getElementById('task-category');
            const priorityInput = document.getElementById('task-priority');
            const timeInput = document.getElementById('task-time');
            const noteInput = document.getElementById('task-note');

            if (!titleInput || !titleInput.value.trim()) return;

            addTask(
                titleInput.value,
                categoryInput ? categoryInput.value : 'Kerja',
                priorityInput ? priorityInput.value : 'Sedang',
                timeInput ? timeInput.value : '',
                noteInput ? noteInput.value : ''
            );

            titleInput.value = '';
            if (timeInput) timeInput.value = '';
            if (noteInput) noteInput.value = '';
            
            const noteContainer = document.getElementById('note-input-container');
            const noteToggleText = document.getElementById('note-toggle-text');
            if (noteContainer) {
                noteContainer.classList.add('hidden');
                noteContainer.style.display = 'none';
            }
            if (noteToggleText) noteToggleText.textContent = '+ Tambah Catatan Tambahan (Opsional)';
            resetFormPillsToDefault();

            titleInput.focus();
        });
    }

    const toggleNoteBtn = document.getElementById('toggle-note-btn');
    const noteContainer = document.getElementById('note-input-container');
    const noteToggleText = document.getElementById('note-toggle-text');

    if (toggleNoteBtn) {
        toggleNoteBtn.addEventListener('click', () => {
            if (!noteContainer || !noteToggleText) return;
            const isHidden = noteContainer.classList.contains('hidden');
            if (isHidden) {
                noteContainer.classList.remove('hidden');
                noteContainer.style.display = 'block';
                noteToggleText.textContent = '- Sembunyikan Catatan';
                const noteInput = document.getElementById('task-note');
                if (noteInput) noteInput.focus();
            } else {
                noteContainer.classList.add('hidden');
                noteContainer.style.display = 'none';
                noteToggleText.textContent = '+ Tambah Catatan Tambahan (Opsional)';
            }
        });
    }

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.getAttribute('data-filter');
            updateUI();
        });
    });

    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            updateUI();
        });
    }

    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            currentSort = e.target.value;
            updateUI();
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            updateUI();
        });
    }

    const resetTodayBtn = document.getElementById('reset-today-btn');
    if (resetTodayBtn) {
        resetTodayBtn.addEventListener('click', () => {
            if (tasks.length === 0) return;
            let changed = false;
            tasks.forEach(t => {
                if (t.completed) {
                    t.completed = false;
                    changed = true;
                }
            });
            if (changed) {
                saveTasks();
                updateUI();
                showToast('Semua status centang direset untuk hari baru! 🌅', 'success');
            } else {
                showToast('Belum ada tugas yang selesai untuk direset.', 'info');
            }
        });
    }

    const clearCompBtn = document.getElementById('clear-completed-btn');
    if (clearCompBtn) {
        clearCompBtn.addEventListener('click', () => {
            const completedCount = tasks.filter(t => t.completed).length;
            if (completedCount === 0) {
                showToast('Tidak ada tugas selesai yang bisa dihapus.', 'info');
                return;
            }
            if (confirm(`Yakin ingin menghapus ${completedCount} tugas yang sudah selesai?`)) {
                tasks = tasks.filter(t => !t.completed);
                saveTasks();
                updateUI();
                showToast('Semua tugas selesai telah dibersihkan! 🧹');
            }
        });
    }

    const clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (tasks.length === 0) return;
            if (confirm('Yakin ingin menghapus seluruh daftar tugasmu?')) {
                tasks = [];
                saveTasks();
                updateUI();
                showToast('Seluruh daftar tugas telah dihapus.');
            }
        });
    }

    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editForm = document.getElementById('edit-form');

    if (closeModalBtn && editModal) {
        closeModalBtn.addEventListener('click', () => {
            editModal.classList.add('hidden');
            editModal.style.display = 'none';
        });
    }
    if (cancelEditBtn && editModal) {
        cancelEditBtn.addEventListener('click', () => {
            editModal.classList.add('hidden');
            editModal.style.display = 'none';
        });
    }
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const editId = document.getElementById('edit-id');
            const editTitle = document.getElementById('edit-title');
            const editCategory = document.getElementById('edit-category');
            const editPriority = document.getElementById('edit-priority');
            const editTime = document.getElementById('edit-time');
            const editNote = document.getElementById('edit-note');

            saveEditedTask(
                editId ? editId.value : '',
                editTitle ? editTitle.value : '',
                editCategory ? editCategory.value : 'Kerja',
                editPriority ? editPriority.value : 'Sedang',
                editTime ? editTime.value : '',
                editNote ? editNote.value : ''
            );
        });
    }

    const backupModal = document.getElementById('backup-modal');
    const openBackupBtn = document.getElementById('open-backup-modal-btn');
    const closeBackupBtn = document.getElementById('close-backup-modal-btn');

    if (openBackupBtn && backupModal) {
        openBackupBtn.addEventListener('click', () => {
            backupModal.classList.remove('hidden');
            backupModal.style.display = 'flex';
        });
    }
    if (closeBackupBtn && backupModal) {
        closeBackupBtn.addEventListener('click', () => {
            backupModal.classList.add('hidden');
            backupModal.style.display = 'none';
        });
    }

    const exportJsonBtn = document.getElementById('export-json-btn');
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `DailyFlow_Backup_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('Backup berhasil diunduh! 📁', 'success');
        });
    }

    const importInput = document.getElementById('import-json-file');
    if (importInput) {
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedTasks = JSON.parse(event.target.result);
                    if (Array.isArray(importedTasks)) {
                        tasks = importedTasks;
                        saveTasks();
                        updateUI();
                        if (backupModal) {
                            backupModal.classList.add('hidden');
                            backupModal.style.display = 'none';
                        }
                        showToast('Data tugas berhasil dipulihkan dari file backup! 📥', 'success');
                    } else {
                        showToast('Format file backup tidak valid.', 'error');
                    }
                } catch (err) {
                    showToast('Gagal membaca file JSON backup.', 'error');
                }
            };
            reader.readAsText(file);
        });
    }

    const resetHabitsBtn = document.getElementById('reset-default-habits-btn');
    if (resetHabitsBtn) {
        resetHabitsBtn.addEventListener('click', () => {
            DEFAULT_QUICK_HABITS.forEach(habit => {
                const exists = tasks.some(t => t.title.toLowerCase() === habit.title.toLowerCase());
                if (!exists) {
                    tasks.push({
                        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                        title: habit.title,
                        category: habit.category,
                        priority: habit.priority,
                        time: habit.time,
                        note: 'Rutinitas harian',
                        completed: false,
                        createdAt: Date.now()
                    });
                }
            });
            saveTasks();
            updateUI();
            if (backupModal) {
                backupModal.classList.add('hidden');
                backupModal.style.display = 'none';
            }
            showToast('Rutinitas standar berhasil ditambahkan ke daftar tugas! ✨', 'success');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === editModal && editModal) {
            editModal.classList.add('hidden');
            editModal.style.display = 'none';
        }
        if (e.target === backupModal && backupModal) {
            backupModal.classList.add('hidden');
            backupModal.style.display = 'none';
        }
    });
}

// ==========================================
// 9. Sistem Toast & Efek Konfeti (Navy Blue Theme)
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    toast.innerHTML = `
        <span>${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #fff; cursor: pointer;">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3800);
}

function showUndoToast(message, undoCallback) {
    if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
    }

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    const undoBtn = document.createElement('button');
    undoBtn.className = 'preset-btn';
    undoBtn.style.backgroundColor = '#2563eb';
    undoBtn.style.color = '#ffffff';
    undoBtn.style.border = 'none';
    undoBtn.textContent = 'Urungkan (Undo)';

    undoBtn.addEventListener('click', () => {
        undoCallback();
        toast.remove();
    });

    toast.appendChild(textSpan);
    toast.appendChild(undoBtn);
    container.appendChild(toast);

    undoTimeoutId = setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
        recentlyDeletedTask = null;
    }, 5000);
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 110,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#f59e0b']
        });
    }
}

// Utilitas Keamanan Teks
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
