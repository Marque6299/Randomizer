/**
 * Manages the state of participants, modes, and file parsing.
 */
export class DataManager {
    constructor() {
        this.participants = []; // Array of { name, weight, id }
        this.mode = 'random'; // 'random' | 'weighted'
        
        // Load default demo data
        this.loadDemoData();
    }

    loadDemoData() {
        this.participants = [
            { name: "Alice", weight: 1 },
            { name: "Bob", weight: 1 },
            { name: "Charlie", weight: 2 },
            { name: "Diana", weight: 1 },
            { name: "Ethan", weight: 5 }, // High weight
            { name: "Fiona", weight: 1 },
            { name: "George", weight: 1 }
        ];
    }

    getParticipants() {
        return this.participants;
    }

    setMode(mode) {
        this.mode = mode;
    }

    addParticipant(name, weight = 1) {
        this.participants.push({ name, weight });
    }

    clearParticipants() {
        this.participants = [];
    }

    /**
     * Parse an uploaded file (Excel/CSV)
     * @param {File} file 
     * @returns {Promise<Array>} List of participants
     */
    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Assume first sheet
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    
                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    // Parse rows (skip header if detected)
                    // Simple heuristic: if row 0 has "name" (case insensitive), skip it
                    let startIndex = 0;
                    if (jsonData.length > 0 && typeof jsonData[0][0] === 'string' && jsonData[0][0].toLowerCase().includes('name')) {
                        startIndex = 1;
                    }

                    const parsed = [];
                    for(let i = startIndex; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (row && row.length > 0 && row[0]) {
                            parsed.push({
                                name: String(row[0]).trim(),
                                weight: row[1] ? Number(row[1]) : 1
                            });
                        }
                    }
                    
                    if (parsed.length > 0) {
                        this.participants = parsed;
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
