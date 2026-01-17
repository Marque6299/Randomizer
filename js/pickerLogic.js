/**
 * Pure logic for selecting winners.
 * Handles both uniform random and weighted random selections.
 */
export const PickerLogic = {
    
    /**
     * Select a winner from a list of participants based on mode
     * @param {Array} participants - List of {name, weight} objects
     * @param {string} mode - 'random' or 'weighted'
     * @returns {Object} The selected participant object
     */
    selectWinner(participants, mode) {
        if (!participants || participants.length === 0) return null;

        if (mode === 'weighted') {
            return this._selectWeighted(participants);
        } else {
            return this._selectUniform(participants);
        }
    },

    /**
     * Uniform random selection (everyone has equal chance)
     */
    _selectUniform(participants) {
        const index = Math.floor(Math.random() * participants.length);
        return participants[index];
    },

    /**
     * Weighted random selection algorithm
     * Uses cumulative weight calculation
     */
    _selectWeighted(participants) {
        const totalWeight = participants.reduce((sum, p) => sum + (p.weight || 1), 0);
        let randomValue = Math.random() * totalWeight;
        
        for (const p of participants) {
            const weight = p.weight || 1;
            if (randomValue < weight) {
                return p;
            }
            randomValue -= weight;
        }
        
        // Fallback (should rarely reach here if logic is correct)
        return participants[participants.length - 1];
    },

    /**
     * Shuffles an array (Fisher-Yates)
     * Useful for generating the visual track order
     */
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    /**
     * Generate a large display list for the infinite scroll illusion.
     * Starts with a random slice, ensures the Winner is at the specific target index.
     * @param {Array} participants 
     * @param {Object} winner 
     * @param {Number} minLength - Minimum length of the track
     * @returns {Array} Array of participants for the track
     */
    generateTrackList(participants, winner, targetIndex = 50) {
        // We need a long list to scroll through.
        // We fill it with random picks from the participants list.
        // We ensure the 'winner' is placed exactly at 'targetIndex'.
        
        const track = [];
        
        // Fill before winner
        for(let i = 0; i < targetIndex; i++) {
            track.push(participants[Math.floor(Math.random() * participants.length)]);
        }

        // Place winner
        track.push(winner);

        // Fill after winner (buffer for deceleration overshoot)
        for(let i = 0; i < 20; i++) {
            track.push(participants[Math.floor(Math.random() * participants.length)]);
        }

        return track;
    }
};
