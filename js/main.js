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
        
        // Generate Premium List HTML
        const listHtml = log.map((en, index) => {
            const w = en.winner;
            const hash = w.name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
            const hue = Math.abs(hash % 360);
            const color = `hsl(${hue}, 70%, 65%)`;

            return `
            <div class="history-card-item">
                <div class="h-avatar" style="background: ${color}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div class="h-info">
                    <div class="h-time">${en.timestamp}</div>
                    <div class="h-name">${w.name}</div>
                    <div class="h-details">
                        ${w.uid ? `<span>ID: ${w.uid}</span>` : ''}
                        ${w.shift ? `<span>• ${w.shift}</span>` : ''}
                    </div>
                </div>
                <div class="h-prize">
                     <span class="prize-icon">🏆</span>
                     <input type="text" 
                        class="input-prize-edit"
                        value="${en.prize}" 
                        onchange="window.updateHistoryPrize(${index}, this.value)"
                        placeholder="Add Prize"
                    >
                </div>
            </div>
            `;
        }).join('');
        
        // Inject into container - NOTE: checking if we need to replace TABLE with DIV structure in HTML
        // For minimal HTML change, we will inject this into the .modal-body's container, replacing the table.
        const container = document.querySelector('#modal-history .table-container');
        if(container) {
            container.innerHTML = `<div class="history-list-grid">${listHtml}</div>`;
        }
    }

    // Animation Logic
    
    startIdleSequence() {
        const participants = this.dataManager.getParticipants();
        if (participants.length === 0) {
            this.track.innerHTML = '<div class="picker-card">Add Participants</div>';
            this.animationEngine.stopIdle();
            return;
        }
        
        const buffer = [];
        for(let i=0; i<30; i++) {
             buffer.push(participants[i % participants.length]);
        }
        
        this.renderCardsToTrack(buffer, true);
        this.currentTrackData = buffer;
        
        this.animationEngine.startIdle();
    }
    
    handleIdleLoop() {
         const participants = this.dataManager.getParticipants();
         if (!participants.length) return;
         
         const p = participants[Math.floor(Math.random() * participants.length)];
         const div = this.createCardElement(p);
         this.track.appendChild(div);
    }
    
    spin() {
        const participants = this.dataManager.getParticipants();
        if (participants.length === 0) { alert("Add participants!"); return; }
        
        this.btnSpin.disabled = true;
        this.audioManager.playSpinStart();
        
        const winner = PickerLogic.selectWinner(participants, this.dataManager.mode);
        this.currentWinner = winner;
        
        const currentCardCount = this.track.children.length;
        // Adjust landing distance based on duration? 
        // 15s needs more cards than 5s.
        // Approx 10 cards per second at max speed?
        const duration = parseInt(document.getElementById('spin-duration').value) * 1000;
        const landingDistance = Math.max(60, Math.floor(duration / 100)); // Dynamic distance
        
        const targetIndex = currentCardCount + landingDistance; 
        
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
        
        // Add Visual Helper (Debug Line) if not exists
        if(!document.getElementById('debug-line')) {
            const line = document.createElement('div');
            line.id = 'debug-line';
            line.style.position = 'absolute';
            line.style.left = '50%';
            line.style.top = '0';
            line.style.bottom = '0';
            line.style.width = '2px';
            line.style.background = 'rgba(255, 0, 0, 0.5)';
            line.style.zIndex = '100';
            line.style.pointerEvents = 'none';
            document.querySelector('.picker-window').appendChild(line);
        }
        
        this.animationEngine.spinFromIdle(currentCardCount + landingDistance, duration, this.currentTheme);
    }
    
    onSpinFinish() {
        this.audioManager.playWin();
        const prize = this.prizeInput.value.trim();
        this.dataManager.logWin(this.currentWinner, prize);
        
        if(this.dataManager.removeWinner) {
            this.dataManager.removeParticipant(this.currentWinner.id);
        }
        
        // DELAY: Wait 2.0s to show modal so user sees arrow verify
        setTimeout(() => {
            if(document.getElementById('debug-line')) document.getElementById('debug-line').remove();
            this.showWinnerModal(prize);
            this.btnSpin.disabled = false;
            this.prizeInput.value = "";
        }, 2000);
    }
    
    showWinnerModal(prize) {
        this.winnerNameDisplay.textContent = this.currentWinner.name;
        this.winnerPrizeDisplay.textContent = prize ? `Prize: ${prize}` : "CONGRATULATIONS!";
        
        const avatarContainer = document.getElementById('winner-avatar');
        // Generate Avatar Again
        const p = this.currentWinner;
        const hash = p.name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const hue = Math.abs(hash % 360);
        const color = `hsl(${hue}, 70%, 65%)`;
        avatarContainer.innerHTML = `
            <div style="background: ${color}; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 50%; color: white;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>
        `;

        this.winnerDetailsDisplay.innerHTML = `
            <div class="winner-detail-item">
                <span class="label">ID Number</span>
                <span class="value">${this.currentWinner.uid || 'N/A'}</span>
            </div>
            <div class="winner-detail-item">
                <span class="label">Department/Shift</span>
                <span class="value">${this.currentWinner.shift || 'N/A'}</span>
            </div>
            <div class="winner-detail-item">
                <span class="label">Supervisor</span>
                <span class="value">${this.currentWinner.supervisor || 'N/A'}</span>
            </div>
            <div class="winner-detail-item">
                <span class="label">Role/Tag</span>
                <span class="value">${this.currentWinner.tag || 'Participant'}</span>
            </div>
        `;
        
        this.modalWinner.classList.remove('hidden');
        
        const container = document.getElementById('confetti-container');
        container.innerHTML = '';
        const colors = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b'];
        for(let i=0; i<50; i++) {
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
                 <div class="slide-avatar" style="background: ${color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid white;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 60%; height: 60%; color: white;">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                 </div>
                 <div class="slide-name">${w.name}</div>
                 <div class="slide-prize">${entry.prize || 'No Prize'}</div>
                 <div class="slide-details">
                    ${w.uid ? `<div class="slide-pill">${w.uid}</div>` : ''}
                    ${w.supervisor ? `<div class="slide-pill">${w.supervisor}</div>` : ''}
                    ${w.shift ? `<div class="slide-pill">${w.shift}</div>` : ''}
                 </div>
             `;
             
             // Trigger re-flow for animation
             display.classList.remove('animate');
             void display.offsetWidth;
             display.style.animation = 'none';
             display.offsetHeight; /* trigger reflow */
             display.style.animation = 'slideUp 0.5s ease-out';
             
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
};

// Start App
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
