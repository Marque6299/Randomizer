import { DataManager } from './dataManager.js';
import { PickerLogic } from './pickerLogic.js';
import { AnimationEngine } from './animationEngine.js';
import { AudioManager } from './audioManager.js';

class App {
    constructor() {
        // Elements
        this.track = document.getElementById('picker-track');
        this.btnSpin = document.getElementById('btn-spin');
        this.modalWinner = document.getElementById('modal-winner');
        this.winnerNameDisplay = document.getElementById('winner-name');
        this.fileInput = document.getElementById('file-upload');
        this.participantsListEl = document.getElementById('participants-list');
        this.participantCountEl = document.getElementById('participant-count');
        
        // Modules
        this.dataManager = new DataManager();
        this.audioManager = new AudioManager();
        
        // Measurements for Animation (Card = 280px, Gap = 20px)
        this.animationEngine = new AnimationEngine(this.track, 280, 20);
        
        // State
        this.winnerIndex = 50; // We will generate 50 cards before the winner
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderParticipantsList();
        this.prepareTrack(); // Render initial static track
        
        // Link animation events
        this.animationEngine.onTick = () => this.audioManager.playTick();
        this.animationEngine.onFinish = () => this.onSpinFinish();
    }

    setupEventListeners() {
        // Spin Button
        this.btnSpin.addEventListener('click', () => this.spin());

        // Mode Switching
        document.getElementById('btn-mode-random').addEventListener('click', (e) => this.setMode('random', e.target));
        document.getElementById('btn-mode-weighted').addEventListener('click', (e) => this.setMode('weighted', e.target));

        // Sound Toggle
        document.getElementById('btn-sound-toggle').addEventListener('click', (e) => {
            const isMuted = this.audioManager.toggleMute();
            e.currentTarget.querySelector('.icon').textContent = isMuted ? '🔇' : '🔊';
        });

        // Participants Modal
        document.getElementById('btn-participants').addEventListener('click', () => {
            document.getElementById('modal-participants').classList.toggle('hidden');
        });
        document.getElementById('btn-close-participants').addEventListener('click', () => {
            document.getElementById('modal-participants').classList.add('hidden');
        });
        
        // Winner Modal
        document.getElementById('btn-close-winner').addEventListener('click', () => {
             this.modalWinner.classList.add('hidden');
             this.prepareTrack(); // Reset track for next spin
        });

        // File Upload
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drag and Drop
        const dropZone = document.getElementById('drop-zone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if(e.dataTransfer.files.length) {
                this.handleFileUpload({ target: { files: e.dataTransfer.files } });
            }
        });

        // Clear Data
        document.getElementById('btn-clear-data').addEventListener('click', () => {
            this.dataManager.clearParticipants();
            this.renderParticipantsList();
            this.prepareTrack();
        });
        
        // Template Download
        document.getElementById('link-template').addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadTemplate();
        });
    }

    setMode(mode, btn) {
        // Update UI
        document.querySelectorAll('.mode-switch .nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.dataManager.setMode(mode);
        this.prepareTrack(); // Visual refresh
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if(!file) return;

        try {
            await this.dataManager.parseFile(file);
            this.renderParticipantsList();
            this.prepareTrack();
            // Close modal automatically on success for smoother flow
            // document.getElementById('modal-participants').classList.add('hidden');
        } catch (error) {
            alert("Error parsing file: " + error);
        }
    }

    renderParticipantsList() {
        const list = this.dataManager.getParticipants();
        this.participantCountEl.textContent = list.length;
        
        this.participantsListEl.innerHTML = list.map(p => `
            <div class="participant-item">
                <span class="p-name">${p.name}</span>
                <span class="p-weight badge">${p.weight > 1 ? 'Weight: ' + p.weight : ''}</span>
            </div>
        `).join('');
    }

    prepareTrack() {
        const participants = this.dataManager.getParticipants();
        if (participants.length === 0) {
            this.track.innerHTML = '<div class="picker-card">Add Participants</div>';
            return;
        }

        // Create a static, nice looking starting view
        // We just show a random slice of them
        const displayList = PickerLogic.shuffle(participants).slice(0, 5);
        this.renderCards(displayList);
        this.animationEngine.reset();
    }

    spin() {
        const participants = this.dataManager.getParticipants();
        if (participants.length === 0) {
            alert("Please add participants first!");
            return;
        }

        // 1. Determine Winner immediately
        const winner = PickerLogic.selectWinner(participants, this.dataManager.mode);
        
        // 2. Generate the visual track list with winner at index 50
        const trackList = PickerLogic.generateTrackList(participants, winner, this.winnerIndex);
        
        // 3. Render the full track
        this.renderCards(trackList);
        
        // 4. Disable controls
        this.btnSpin.disabled = true;
        this.audioManager.playSpinStart();

        // 5. Start Animation
        this.animationEngine.reset(); // Snap to start
        
        // Small delay to allow DOM render
        setTimeout(() => {
            this.animationEngine.spin(this.winnerIndex, 6000); // 6 seconds spin
        }, 50);
        
        this.currentWinner = winner;
    }

    onSpinFinish() {
        this.audioManager.playWin();
        this.fireConfetti();
        
        // Show Modal
        this.winnerNameDisplay.textContent = this.currentWinner.name;
        this.modalWinner.classList.remove('hidden');
        
        this.btnSpin.disabled = false;
    }

    renderCards(list) {
        this.track.innerHTML = list.map((p, index) => {
            // Check if this specific card instance is the target winner card
            // Used for visual debugging or special effects (though we hide it initially)
            const isTarget = (index === this.winnerIndex) && this.animationEngine.isSpinning;
            
            return `
            <div class="picker-card ${isTarget ? 'target-card' : ''}">
                <div class="card-name">${p.name}</div>
                ${this.dataManager.mode === 'weighted' && p.weight > 1 ? `<div class="card-weight">x${p.weight}</div>` : ''}
            </div>
        `}).join('');
    }

    fireConfetti() {
        // Simple confetti DOM implementation
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
    
    downloadTemplate() {
        const ws = XLSX.utils.json_to_sheet([
            { Name: "John Doe", Weight: 1 },
            { Name: "Jane Smith", Weight: 5 },
            { Name: "Bob Johnson", Weight: 1 }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Participants");
        XLSX.writeFile(wb, "name_picker_template.xlsx");
    }
}

// Start App
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
