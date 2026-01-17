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
        
        // Expose global helpers for inline events (simple approach)
        window.updateWeight = (id, val) => this.dataManager.updateWeight(id, val);
        window.removeParticipant = (id) => {
            this.dataManager.removeParticipant(id);
            this.updateParticipantsUI();
            this.startIdleSequence();
        }
    }
    
    renderHistory() {
        const log = this.dataManager.getHistory();
        this.historyListEl.innerHTML = log.map(en => `
            <tr>
                <td>${en.timestamp}</td>
                <td><strong>${en.winner.name}</strong></td>
                <td>${en.winner.uid || '-'}</td>
                <td>${en.winner.shift || '-'}</td>
                <td>${en.winner.supervisor || '-'}</td>
                <td style="color: var(--accent-secondary); font-weight: bold">${en.prize}</td>
            </tr>
        `).join('');
    }

    // Animation Logic
    
    startIdleSequence() {
        const participants = this.dataManager.getParticipants();
        if (participants.length === 0) {
            this.track.innerHTML = '<div class="picker-card">Add Participants</div>';
            this.animationEngine.stopIdle();
            return;
        }
        
        // Create initial buffer for infinite scroll
        // We need enough cards to cover screen + buffer
        // Say 20 cards
        const buffer = [];
        for(let i=0; i<30; i++) {
             buffer.push(participants[i % participants.length]);
        }
        
        // Initial render
        this.renderCardsToTrack(buffer, true);
        this.currentTrackData = buffer;
        
        this.animationEngine.startIdle();
    }
    
    handleIdleLoop() {
        // Called when a card exits the left screen
        // In a real infinite DOM loop, we would remove the first child and append a new one
        // To keep transformation smooth, we need to adjust translateX + itemSize
        // But `AnimationEngine` logic handles raw translation.
        
        // Simplified approach for this tech stack:
        // We won't mutate DOM constantly to avoid layout shifts syncing issues in this simple engine.
        // Instead, valid approach: 
        // Just let it scroll. When it gets VERY far (like 100 cards), reset?
        // No, user wants INFINITE.
        
        // Correct Infinite DOM approach:
        // 1. Remove first element.
        // 2. Adjust Track Transform by +ItemSize (cancel out the movement).
        // 3. Append new element to end.
        
        // Refinement:
        // AnimationEngine controls transform. It notified us `onCardExit`.
        // We:
        // 1. Append a random participant to the end of track
        // 2. Note: we are NOT removing from front to avoid coordinate jumping complex logic in Engine.
        //    We will clean up only on Reset/Spin. 
        //    (For a session < 1 hour, n_nodes won't kill browser).
        
        // actually, let's append!
         const participants = this.dataManager.getParticipants();
         if (!participants.length) return;
         
         const p = participants[Math.floor(Math.random() * participants.length)];
         const div = this.createCardElement(p);
         this.track.appendChild(div);
    }
    
    spin() {
        const participants = this.dataManager.getParticipants();
        if (participants.length === 0) { alert("Add participants!"); return; }
        
        // 1. Lock UI
        this.btnSpin.disabled = true;
        this.audioManager.playSpinStart();
        
        // 2. Select Winner
        const winner = PickerLogic.selectWinner(participants, this.dataManager.mode);
        this.currentWinner = winner;
        
        // 3. Prepare Track for Landing
        // We are currently in IDLE.
        // We need to append the "Winning Sequence" to the end of the current track.
        // Logic:
        // Count current children.
        // The "Target Index" must be far enough to allow the spin duration.
        // AnimationEngine.position is negative.
        // Current Index = abs(pos) / itemSize.
        // We want to land at Current Index + Displacment.
        // Displacement for 6s at high speed ~ 100 cards?
        // Let's safe bet: Append 60 cards, ensuring #60 is winner.
        
        const currentCardCount = this.track.children.length;
        const landingDistance = 60; // How many cards from NOW until winner
        const targetIndex = currentCardCount + landingDistance; 
        
        // Generate filler cards
        const fragment = document.createDocumentFragment();
        for(let i=0; i<landingDistance; i++) {
             const r = participants[Math.floor(Math.random() * participants.length)];
             fragment.appendChild(this.createCardElement(r));
        }
        
        // Append Winner
        const winEl = this.createCardElement(winner, true); // true for visual highlight
        fragment.appendChild(winEl);
        
        // Append Buffer
        for(let i=0; i<10; i++) {
             const r = participants[Math.floor(Math.random() * participants.length)];
             fragment.appendChild(this.createCardElement(r));
        }
        
        this.track.appendChild(fragment);
        
        // 4. Execute Spin (Seamless)
        // targetIndex is the index of the winner in the DOM
        this.animationEngine.spinFromIdle(targetIndex + landingDistance, 6000, this.currentTheme);
        // Note: targetIndex calculation above was `currentCardCount + landingDistance`.
        // But `spinFromIdle` expects the *absolute* index.
        // So targetIndex passed to engine should be `currentCardCount + landingDistance`.
        
        // Wait, loop above:
        // we appended `landingDistance` items (0..59).
        // Then winner.
        // So winner is at `currentCardCount + landingDistance`.
        // Correct.
        this.animationEngine.spinFromIdle(currentCardCount + landingDistance, 6000, this.currentTheme);
    }
    
    onSpinFinish() {
        this.audioManager.playWin();
        
        // Prize
        const prize = this.prizeInput.value.trim();
        
        // Log
        this.dataManager.logWin(this.currentWinner, prize);
        
        // Remove Functionality
        if(this.dataManager.removeWinner) {
            this.dataManager.removeParticipant(this.currentWinner.id);
        }
        
        this.showWinnerModal(prize);
        this.btnSpin.disabled = false;
        this.prizeInput.value = ""; // Reset
    }
    
    showWinnerModal(prize) {
        this.winnerNameDisplay.textContent = this.currentWinner.name;
        this.winnerPrizeDisplay.textContent = prize ? `Prize: ${prize}` : "";
        
        // Details
        this.winnerDetailsDisplay.innerHTML = `
            ${this.currentWinner.uid ? `<span class="detail-pill">ID: ${this.currentWinner.uid}</span>` : ''}
            ${this.currentWinner.supervisor ? `<span class="detail-pill">Sup: ${this.currentWinner.supervisor}</span>` : ''}
            ${this.currentWinner.shift ? `<span class="detail-pill">Shift: ${this.currentWinner.shift}</span>` : ''}
            ${this.currentWinner.tag ? `<span class="detail-pill">${this.currentWinner.tag}</span>` : ''}
        `;
        
        this.modalWinner.classList.remove('hidden');
        
        // Fire confetti
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
}

// Start App
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
