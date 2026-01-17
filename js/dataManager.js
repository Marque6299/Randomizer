/**
 * Manages the state of participants, modes, and file parsing.
 */
export class DataManager {
    constructor() {
        this.participants = []; // Array of { name, uid, supervisor, shift, tag, weight, id }
        this.historyLog = []; // Array of { timestamp, winner, prize }
        this.mode = 'random'; // 'random' | 'weighted'
        this.removeWinner = false; // Setting
        
        // Load default demo data if empty
        this.loadDemoData();
    }

    loadDemoData() {
        // ID generation helper
        const uid = () => Math.random().toString(36).substr(2, 9);
        
        this.participants = [
            { id: uid(), name: "Alice", uid: "A001", supervisor: "Smith", shift: "Morning", tag: "Team A", weight: 1 },
            { id: uid(), name: "Bob", uid: "B002", supervisor: "Smith", shift: "Morning", tag: "Team A", weight: 1 },
            { id: uid(), name: "Charlie", uid: "C003", supervisor: "Jones", shift: "Night", tag: "Team B", weight: 2 },
            { id: uid(), name: "Diana", uid: "D004", supervisor: "Jones", shift: "Night", tag: "Team B", weight: 1 },
            { id: uid(), name: "Ethan", uid: "E005", supervisor: "Brown", shift: "Morning", tag: "Team C", weight: 5 },
        ];
    }

    getParticipants() {
        return this.participants;
    }
    
    getHistory() {
        return this.historyLog;
    }

    setMode(mode) {
        this.mode = mode;
    }
    
    setRemoveWinner(val) {
        this.removeWinner = val;
    }

    updateWeight(id, newWeight) {
        const p = this.participants.find(p => p.id === id);
        if(p) {
            p.weight = Number(newWeight);
        }
    }

    removeParticipant(id) {
        this.participants = this.participants.filter(p => p.id !== id);
    }

    clearParticipants() {
        this.participants = [];
    }
    
    logWin(winner, prize) {
        // Prevent duplicates (simple debounce check)
        const now = new Date();
        if (this.historyLog.length > 0) {
            const last = this.historyLog[0];
            const timeDiff = now - last._rawDate;
            // If same winner and less than 2 seconds, ignore
            if (last.winner.id === winner.id && timeDiff < 2000) {
                return;
            }
        }

        this.historyLog.unshift({
            _rawDate: now,
            timestamp: now.toLocaleString(),
            winner: winner, // Stores full object {name, uid, shift...}
            prize: prize || "No Prize"
        });
    }

    /**
     * Parse an uploaded file (Excel/CSV)
     */
    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    // Header detection
                    let headers = [];
                    let startIndex = 0;
                    
                    if (jsonData.length > 0) {
                         // Check first row for "Name"
                         const row0 = jsonData[0].map(c => String(c).toLowerCase());
                         if(row0.includes('name')) {
                             headers = row0;
                             startIndex = 1;
                         } else {
                             // Default mapping: 0=Name, 1=Weight
                             headers = ['name', 'weight', 'uid', 'supervisor', 'shift', 'tag'];
                         }
                    }

                    const findIdx = (key) => headers.indexOf(key);

                    const parsed = [];
                    for(let i = startIndex; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0) continue;
                        
                        // Map by header index or default position
                        // Default fallback: Name=0, Weight=1, UID=2, Sup=3, Shift=4, Tag=5
                        
                        const val = (idx) => row[idx] ? String(row[idx]).trim() : "";
                        
                        // Helper to find value by header name OR default index
                        const getVal = (key, defaultIdx) => {
                             const hIdx = findIdx(key);
                             if (hIdx !== -1) return val(hIdx);
                             return val(defaultIdx);
                        };
                        
                        const name = getVal('name', 0);
                        if(!name) continue;

                        parsed.push({
                            id: Math.random().toString(36).substr(2, 9),
                            name: name,
                            weight: Number(getVal('weight', 1)) || 1,
                            uid: getVal('uid', 2),
                            supervisor: getVal('supervisor', 3),
                            shift: getVal('shift', 4),
                            tag: getVal('tag', 5)
                        });
                    }
                    
                    if (parsed.length > 0) {
                        // Append to existing
                        this.participants = [...this.participants, ...parsed];
                        resolve(parsed);
                    } else {
                        reject("No valid data found.");
                    }

                } catch (err) {
                    reject(err);
                }
            };

            reader.readAsArrayBuffer(file);
        });
    }
}
