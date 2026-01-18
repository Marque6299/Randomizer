import { DataManager } from './dataManager.js';
import { PickerLogic } from './pickerLogic.js';
import { AnimationEngine } from './animationEngine.js';
import { AudioManager } from './audioManager.js';

class App {
    constructor() {
        // Elements
        this.track = document.getElementById('picker-track');
        this.btnSpin = document.getElementById('btn-spin');
        
        // Modals
        this.modalWinner = document.getElementById('modal-winner');
        this.winnerNameDisplay = document.getElementById('winner-name');
        this.winnerPrizeDisplay = document.getElementById('winner-prize');
        this.winnerDetailsDisplay = document.getElementById('winner-details');
        
        this.modalParticipants = document.getElementById('modal-participants');
        this.modalHistory = document.getElementById('modal-history');
        
        // Inputs
        this.fileInput = document.getElementById('file-upload');
        this.prizeInput = document.getElementById('prize-input');
        
        // Settings / Panel
        this.settingsPanel = document.getElementById('settings-panel');
        this.panelOverlay = document.getElementById('panel-overlay');
        
        // Lists
        this.historyListEl = document.getElementById('history-list');
        this.participantCountEl = document.getElementById('participant-count');
        this.participantsTableBody = document.getElementById('participants-table-body');
        
        // Modules
        this.dataManager = new DataManager();
        this.audioManager = new AudioManager();
        
        // Measurements
        this.animationEngine = new AnimationEngine(this.track, 280, 20);
        
        // State
        this.winnerIndexKey = 60; // Target index for winning card
        this.currentTheme = 'standard';
        this.idleQueue = []; // Queue for idle scroll cycling
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateParticipantsUI();
        
        // Link animation events
        this.animationEngine.onTick = () => this.audioManager.playTick();
        this.animationEngine.onFinish = () => this.onSpinFinish();
        this.animationEngine.onCardExit = () => this.handleIdleLoop();
        
        // Start Idle Mode
        this.startIdleSequence();
    }

    setupEventListeners() {
        // Spin
        this.btnSpin.addEventListener('click', () => this.spin());
        
        // Settings Panel Toggle
        const toggleSettings = () => {
            this.settingsPanel.classList.toggle('hidden-panel');
            this.panelOverlay.classList.toggle('hidden');
        };
        document.getElementById('btn-settings').addEventListener('click', toggleSettings);
        document.getElementById('btn-close-settings').addEventListener('click', toggleSettings);
        this.panelOverlay.addEventListener('click', toggleSettings);

        // History Toggle
        document.getElementById('btn-history').addEventListener('click', () => {
            this.renderHistory();
            this.modalHistory.classList.remove('hidden');
        });
        document.getElementById('btn-close-history').addEventListener('click', () => {
            this.modalHistory.classList.add('hidden');
        });

        // Participants Toggle
        document.getElementById('btn-participants').addEventListener('click', () => {
            this.updateParticipantsUI(); // Refresh table
            this.modalParticipants.classList.remove('hidden');
        });
        document.getElementById('btn-close-participants').addEventListener('click', () => {
             this.modalParticipants.classList.add('hidden');
        });
        
        // Settings Controls
        document.getElementById('set-mode-random').addEventListener('click', (e) => this.setMode('random', e.target));
        document.getElementById('set-mode-weighted').addEventListener('click', (e) => this.setMode('weighted', e.target));
        
        document.getElementById('toggle-sound').addEventListener('change', (e) => {
            this.audioManager.isMuted = !e.target.checked;
        });

        document.getElementById('toggle-remove-winner').addEventListener('change', (e) => {
             this.dataManager.setRemoveWinner(e.target.checked);
        });

        document.getElementById('anim-theme').addEventListener('change', (e) => {
            this.currentTheme = e.target.value;
        });

        // Winner Modal Close
        document.getElementById('btn-close-winner').addEventListener('click', () => {
             this.modalWinner.classList.add('hidden');
             this.startIdleSequence(); // Go back to idle
        });
        
        // Spin Duration Slider
        const durationInput = document.getElementById('spin-duration');
        const durationDisplay = document.getElementById('duration-value');
        durationInput.addEventListener('input', (e) => {
            durationDisplay.textContent = e.target.value + 's';
        });

        // Idle Speed Slider
        const idleSpeedInput = document.getElementById('idle-speed');
        const idleSpeedDisplay = document.getElementById('idle-speed-value');
        idleSpeedInput.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            idleSpeedDisplay.textContent = speed.toFixed(1);
            this.animationEngine.idleSpeed = speed;
        });

        // App Title Input
        const titleInput = document.getElementById('app-title-input');
        titleInput.addEventListener('input', (e) => {
            const val = e.target.value;
            document.querySelector('.navbar-brand').textContent = val || 'Premium Random Picker';
            document.getElementById('app-title-display').textContent = val || 'Premium Random Picker';
            document.title = val || 'Premium Random Picker';
        });

        // File Upload
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drag Drop
        const dropZone = document.getElementById('drop-zone');
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if(e.dataTransfer.files.length) this.handleFileUpload({ target: { files: e.dataTransfer.files } });
        });

        // Data Actions
        document.getElementById('btn-clear-data').addEventListener('click', () => {
            if(confirm("Clear all participants?")) {
                this.dataManager.clearParticipants();
                this.updateParticipantsUI();
                this.startIdleSequence();
            }
        });

        document.getElementById('link-template').addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadTemplate();
        });
        
        document.getElementById('btn-download-history').addEventListener('click', () => {
             this.downloadHistory();
        });
        
        document.getElementById('btn-slideshow').addEventListener('click', () => {
             this.startSlideshow();
        });
        
        document.getElementById('btn-display-participants').addEventListener('click', () => {
             this.startParticipantSlideshow();
        });
    }
    
    setMode(mode, btn) {
        document.querySelectorAll('.toggle-group .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.dataManager.setMode(mode);
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if(!file) return;
        try {
            await this.dataManager.parseFile(file);
            this.updateParticipantsUI();
            this.startIdleSequence(); // Restart idle with new data
            alert("File parsed successfully!");
        } catch (error) {
            alert("Error: " + error);
        }
    }
    
    // UI Renders
    updateParticipantsUI() {
        const list = this.dataManager.getParticipants();
        this.participantCountEl.textContent = list.length;
        
        // Render Table
        this.participantsTableBody.innerHTML = list.map(p => `
            <tr>
                <td>${p.name}</td>
                <td>${p.uid || '-'}</td>
                <td>${p.supervisor || '-'}</td>
                <td>${p.shift || '-'}</td>
                <td>${p.tag || '-'}</td>
                <td>
                    <input type="number" 
                           class="input-weight" 
                           value="${p.weight}" 
                           min="0" 
                           onchange="window.updateWeight('${p.id}', this.value)"
                    >
                </td>
                <td>
                    <button class="btn-action text-danger" onclick="window.removeParticipant('${p.id}')">&times;</button>
                </td>
            </tr>
        `).join('');
        
        // Expose global helpers
        window.updateWeight = (id, val) => this.dataManager.updateWeight(id, val);
        window.removeParticipant = (id) => {
            this.dataManager.removeParticipant(id);
            this.updateParticipantsUI();
            this.startIdleSequence();
        }
        
        // History Edit Global
        window.updateHistoryPrize = (index, val) => {
            this.dataManager.updateHistoryPrize(index, val);
        }
    }
    
    renderHistory() {
        const log = this.dataManager.getHistory();
        this.historyListEl.innerHTML = log.map((en, index) => `
            <tr>
                <td style="font-size: 0.8rem; color: #94a3b8;">${en.timestamp}</td>
                <td>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 700; color: white;">${en.winner.name}</span>
                        <div style="font-size: 0.75rem; color: #cbd5e1; display: flex; flex-wrap: wrap; gap: 6px;">
                            ${en.winner.uid ? `<span>ID: ${en.winner.uid}</span>` : ''}
                            ${en.winner.shift ? `<span>• ${en.winner.shift}</span>` : ''}
                            ${en.winner.supervisor ? `<span>• Sup: ${en.winner.supervisor}</span>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <input type="text" 
                        class="input-prize-edit"
                        value="${en.prize}" 
                        onchange="window.updateHistoryPrize(${index}, this.value)"
                        placeholder="Add Prize"
                    >
                </td>
            </tr>
        `).join('');
    }

    // Animation Logic
    
    startIdleSequence() {
        // Clear queue so we start fresh (important if data changed)
        this.idleQueue = [];
        
        const participants = this.dataManager.getParticipants();
        if (participants.length === 0) {
            this.track.innerHTML = '<div class="picker-card">Add Participants</div>';
            this.animationEngine.stopIdle();
            return;
        }
        
        // Seamless Carousel Strategy
        // We render ALL participants + a buffer at the end equal to visible cards (~15)
        // The engine handles the loop by resetting position after scrolling "participants.length" items
        
        const bufferCount = 20; // Enough to fill screen width
        const renderList = [...participants];
        
        // Append buffer (first N items repeated at end)
        for(let i=0; i<bufferCount; i++) {
            renderList.push(participants[i % participants.length]);
        }
        
        this.renderCardsToTrack(renderList, true);
        
        // Update Engine with exact count of UNIQUE items for the loop threshold
        this.animationEngine.setItemCount(participants.length);
        
        this.animationEngine.resetPosition();
        this.animationEngine.isSpinning = false;
        this.animationEngine.isIdle = false;
        
        this.animationEngine.startIdle();
    }
    
    handleIdleLoop() {
         // No-op for Seamless Carousel Mode
         // The engine handles the loop math internally now.
         return;
    }
    
    spin() {
        const participants = this.dataManager.getParticipants();
        if (participants.length === 0) { alert("Add participants!"); return; }
        
        this.btnSpin.disabled = true;
        
        // --- PHASE 1: SHUFFLE ---
        const statusEl = document.getElementById('status-indicator');
        statusEl.textContent = "Shuffling Participants...";
        statusEl.style.color = "#fcd34d"; // Gold
        
        // Visual Shuffle Effect (Speed up)
        this.animationEngine.visualShuffle(40); // Fast scroll
        
        // Wait 5 seconds
        setTimeout(() => {
            // --- PHASE 2: PICK ---
            statusEl.textContent = "Picking Winner...";
            statusEl.style.color = "#ec4899"; // Pink
            
            // True Randomization of Data
            this.dataManager.shuffleParticipants();
            
            this.executeSpin(this.dataManager.getParticipants());
        }, 5000);
    }

    executeSpin(participants) {
        this.audioManager.playSpinStart();
        
        // 1. Select Winner
        // 1. Select Winner
        const winner = PickerLogic.selectWinner(participants, this.dataManager.mode);
        this.currentWinner = winner;
        
        // 2. Theme
        const theme = this.currentTheme;

        // 3. Prepare Track
        this.animationEngine.resetIdleSpeed(); // Stop fast shuffle, seamless handoff
        
        const currentCardCount = this.track.children.length;
        const duration = parseInt(document.getElementById('spin-duration').value) * 1000;
        const landingDistance = Math.max(60, Math.floor(duration / 100)); 
        
        const fragment = document.createDocumentFragment();
        for(let i=0; i<landingDistance; i++) {
             const r = participants[Math.floor(Math.random() * participants.length)];
             fragment.appendChild(this.createCardElement(r));
        }
        
        const winEl = this.createCardElement(winner, true); 
        fragment.appendChild(winEl);
        
        for(let i=0; i<10; i++) {
             const r = participants[Math.floor(Math.random() * participants.length)];
             fragment.appendChild(this.createCardElement(r));
        }
        
        this.track.appendChild(fragment);
        
        // 4. Spin
        this.animationEngine.spinFromIdle(currentCardCount + landingDistance, duration, theme);
    }
    
    onSpinFinish() {
        this.audioManager.playWin();
        const statusEl = document.getElementById('status-indicator');
        statusEl.textContent = "Winner Picked!";
        statusEl.style.color = "#22c55e"; // Green
        
        const prize = this.prizeInput.value.trim();
        this.dataManager.logWin(this.currentWinner, prize);
        
        // Weight Mode: Decrement and auto-remove at zero
        if(this.dataManager.mode === 'weighted') {
            const removed = this.dataManager.decrementWeight(this.currentWinner.id);
            if(removed) {
                console.log(`${this.currentWinner.name} weight reached 0, removed from pool.`);
            }
        } else if(this.dataManager.removeWinner) {
            // Random Mode: Use toggle
            this.dataManager.removeParticipant(this.currentWinner.id);
        }
        
        setTimeout(() => {
            this.showWinnerModal(prize);
            this.btnSpin.disabled = false;
            this.prizeInput.value = "";
            statusEl.textContent = "Ready to Pick";
            statusEl.style.color = "var(--accent-cyan)";
            this.updateParticipantsUI(); // Refresh if weight changed
        }, 2000);
    }
    
    showWinnerModal(prize) {
        // Redesigned Winner Modal (Card-in-Card)
        const p = this.currentWinner;
        
        // Generate Color
        const hash = p.name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const hue = Math.abs(hash % 360);
        const color = `hsl(${hue}, 70%, 65%)`;

        this.modalWinner.innerHTML = `
            <div class="modal-content winner-modal-content-reset">
                <button class="close-icon-winner" id="btn-close-winner-dynamic">&times;</button>
                
                <div class="winner-celebration-banner">🏆 WINNER SELECTED! 🏆</div>

                <div class="profile-card-main winner-edition">
                     <div class="profile-card-header">
                         <div class="profile-avatar-wrapper">
                            <div class="profile-avatar winner-avatar-glow" style="background: ${color}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                         </div>
                         <div class="profile-identity">
                             <h2 class="profile-name winner-text-gold">${p.name}</h2>
                             <div class="profile-role-badge winner-badge-gold">${p.tag || 'Winner'}</div>
                         </div>
                     </div>
                     
                     <div class="profile-grid">
                        ${prize ? `
                        <!-- Prize Card (Featured) -->
                        <div class="info-card prize-card-gold">
                            <div class="info-card-icon">
                                <span style="font-size: 1.5rem;">🎁</span>
                            </div>
                            <div class="info-card-content">
                                <span class="info-label">Current Prize</span>
                                <span class="info-value text-gold">${prize}</span>
                            </div>
                        </div>
                        ` : ''}

                        <!-- ID Card -->
                        <div class="info-card">
                            <div class="info-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </div>
                            <div class="info-card-content">
                                <span class="info-label">ID Number</span>
                                <span class="info-value">${p.uid || 'N/A'}</span>
                            </div>
                        </div>

                        <!-- Shift Card -->
                        <div class="info-card">
                            <div class="info-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            </div>
                            <div class="info-card-content">
                                <span class="info-label">Shift</span>
                                <span class="info-value">${p.shift || 'N/A'}</span>
                            </div>
                        </div>

                        <!-- Supervisor Card -->
                        <div class="info-card">
                            <div class="info-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </div>
                            <div class="info-card-content">
                                <span class="info-label">Supervisor</span>
                                <span class="info-value">${p.supervisor || 'N/A'}</span>
                            </div>
                        </div>
                     </div>
                </div>
                
                <div class="confetti-rain" id="dynamic-confetti"></div>
            </div>
        `;
        
        this.modalWinner.classList.remove('hidden');
        
        // Re-bind Close Button
        document.getElementById('btn-close-winner-dynamic').addEventListener('click', () => {
             this.modalWinner.classList.add('hidden');
             this.startIdleSequence();
        });
        
        // Confetti
        const container = document.getElementById('dynamic-confetti');
        const colors = ['#fcd34d', '#fbbf24', '#f59e0b', '#ffffff']; // Gold theme
        for(let i=0; i<80; i++) {
            const conf = document.createElement('div');
            conf.className = 'confetti-piece';
            conf.style.left = Math.random() * 100 + '%';
            conf.style.animationDelay = Math.random() * 2 + 's';
            conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            container.appendChild(conf);
        }
    }

    createCardElement(p, isWinner = false) {
        // Generate a deterministic color
        const hash = p.name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const hue = Math.abs(hash % 360);
        const color = `hsl(${hue}, 70%, 65%)`; // Pastel/Vibrant
        
        const div = document.createElement('div');
        div.className = `picker-card ${isWinner ? 'winner-card-marker' : ''}`;
        
        div.innerHTML = `
            <div class="card-avatar" style="background: ${color}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>
            <div class="card-content">
                <div class="card-name">${p.name}</div>
                <div class="card-role">${p.tag || 'Participant'}</div>
                <div class="card-details">
                    ${p.uid ? `<span class="detail-pill">${p.uid}</span>` : ''}
                    ${p.shift ? `<span class="detail-pill">${p.shift}</span>` : ''}
                </div>
            </div>
            ${this.dataManager.mode === 'weighted' && p.weight > 1 ? `<div class="card-weight">x${p.weight}</div>` : ''}
        `;
        return div;
    }
    
    renderCardsToTrack(list, clear = false) {
        if(clear) this.track.innerHTML = '';
        const frag = document.createDocumentFragment();
        list.forEach(p => frag.appendChild(this.createCardElement(p)));
        this.track.appendChild(frag);
    }
    
    downloadTemplate() {
        const ws = XLSX.utils.json_to_sheet([
            { Name: "John Doe", UID: "123", Supervisor: "Smith", Shift: "Day", Tag: "IT", Weight: 1 }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Participants");
        XLSX.writeFile(wb, "name_picker_template.xlsx");
    }
    
    downloadHistory() {
        const history = this.dataManager.getHistory().map(h => ({
            Time: h.timestamp,
            Winner: h.winner.name || '',
            ID: h.winner.uid || '',
            Supervisor: h.winner.supervisor || '',
            Shift: h.winner.shift || '',
            Tag: h.winner.tag || '',
            Prize: h.prize || ''
        }));
        
        if(history.length === 0) {
            alert("No history to export!");
            return;
        }

        const ws = XLSX.utils.json_to_sheet(history);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Spin_History");
        XLSX.writeFile(wb, `Spin_History_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    startSlideshow() {
        const history = this.dataManager.getHistory();
        if(history.length === 0) {
            alert("No winners to show!");
            return;
        }

        const modal = document.getElementById('modal-slideshow');
        const display = document.getElementById('slide-display');
        modal.classList.remove('hidden');
        
        // Start loop
        let index = 0;
        
        const showSlide = () => {
             if (index >= history.length) index = 0;
             const entry = history[index];
             const w = entry.winner;
             
             // Generate color/avatar
             const hash = w.name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
             const hue = Math.abs(hash % 360);
             const color = `hsl(${hue}, 70%, 65%)`;

             display.innerHTML = `
                 <div class="slide-hero">
                     <div class="slide-avatar-large" style="background: ${color}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 50%; height: 50%; color: white;">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                     </div>
                     <div class="slide-name-large">${w.name}</div>
                     <div class="slide-prize-large">${entry.prize || 'No Prize'}</div>
                 </div>
                 
                 <div class="slide-meta-grid">
                    <div class="slide-meta-item">
                        <span class="slide-meta-label">ID Number</span>
                        <span class="slide-meta-value">${w.uid || '-'}</span>
                    </div>
                    <div class="slide-meta-item">
                        <span class="slide-meta-label">Shift</span>
                        <span class="slide-meta-value">${w.shift || '-'}</span>
                    </div>
                    <div class="slide-meta-item">
                        <span class="slide-meta-label">Supervisor</span>
                        <span class="slide-meta-value">${w.supervisor || '-'}</span>
                    </div>
                     <div class="slide-meta-item">
                        <span class="slide-meta-label">Role</span>
                        <span class="slide-meta-value">${w.tag || '-'}</span>
                    </div>
                 </div>
             `;
             
             // Trigger re-flow for animation
             display.classList.remove('animate');
             const progress = document.getElementById('slide-progress');
             progress.style.transition = 'none';
             progress.style.width = '0%';
             
             void display.offsetWidth; // Force Reflow
             
             display.classList.add('animate');
             progress.style.transition = 'width 5s linear';
             progress.style.width = '100%';
             
             index++;
        };
        
        showSlide();
        this.slideshowInterval = setInterval(showSlide, 5000);
        
        // Close handler
        const closeBtn = document.getElementById('btn-close-slideshow');
        const close = () => {
             clearInterval(this.slideshowInterval);
             modal.classList.add('hidden');
             closeBtn.removeEventListener('click', close);
        };
        closeBtn.addEventListener('click', close);
    }

    startParticipantSlideshow() {
        if (this.participantSlideshowInterval) clearInterval(this.participantSlideshowInterval);
        
        const participants = this.dataManager.getParticipants();
        if(participants.length === 0) {
            alert("No participants to display!");
            return;
        }

        const modal = document.getElementById('modal-participant-slideshow');
        const display = document.getElementById('participant-slide-display');
        
        if(!modal || !display) {
            console.error("Critical: Participant Slideshow elements missing in DOM.");
            return;
        }

        modal.classList.remove('hidden');
        
        // Force Reflow
        void modal.offsetWidth;
        
        let index = 0;
        
        const showSlide = () => {
             if (index >= participants.length) index = 0;
             const p = participants[index];
             
             const hash = p.name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
             const hue = Math.abs(hash % 360);
             const color = `hsl(${hue}, 70%, 65%)`;

             display.innerHTML = `
                 <div class="profile-card-main">
                     <div class="profile-card-header">
                         <div class="profile-avatar-wrapper">
                            <div class="profile-avatar" style="background: ${color}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                         </div>
                         <div class="profile-identity">
                             <h2 class="profile-name">${p.name}</h2>
                             <div class="profile-role-badge">${p.tag || 'Participant'}</div>
                         </div>
                     </div>
                     
                     <div class="profile-grid">
                        <!-- ID Card -->
                        <div class="info-card">
                            <div class="info-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </div>
                            <div class="info-card-content">
                                <span class="info-label">ID Number</span>
                                <span class="info-value">${p.uid || 'N/A'}</span>
                            </div>
                        </div>

                        <!-- Shift Card -->
                        <div class="info-card">
                            <div class="info-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            </div>
                            <div class="info-card-content">
                                <span class="info-label">Shift</span>
                                <span class="info-value">${p.shift || 'N/A'}</span>
                            </div>
                        </div>

                        <!-- Supervisor Card -->
                        <div class="info-card">
                            <div class="info-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </div>
                            <div class="info-card-content">
                                <span class="info-label">Supervisor</span>
                                <span class="info-value">${p.supervisor || 'N/A'}</span>
                            </div>
                        </div>

                        ${this.dataManager.mode === 'weighted' && p.weight > 1 ? `
                        <!-- Weight Card -->
                        <div class="info-card highlight">
                            <div class="info-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-6M6 20V10M18 20V4"></path></svg>
                            </div>
                            <div class="info-card-content">
                                <span class="info-label">Entries</span>
                                <span class="info-value">${p.weight}x</span>
                            </div>
                        </div>
                        ` : ''}
                     </div>
                 </div>
             `;
             
             display.classList.remove('animate');
             const progress = document.getElementById('participant-slide-progress');
             progress.style.transition = 'none';
             progress.style.width = '0%';
             
             void display.offsetWidth;
             
             display.classList.add('animate');
             progress.style.transition = 'width 5s linear';
             progress.style.width = '100%';
             
             index++;
        };
        
        showSlide();
        this.participantSlideshowInterval = setInterval(showSlide, 5000);
        
        const closeBtn = document.getElementById('btn-close-participant-slideshow');
        const close = () => {
             clearInterval(this.participantSlideshowInterval);
             modal.classList.add('hidden');
             closeBtn.removeEventListener('click', close);
        };
        closeBtn.addEventListener('click', close);
    }
}

// Start App
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
