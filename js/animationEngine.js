/**
 * Handles the linear motion animation for the picker.
 * Uses requestAnimationFrame for smooth 60fps performance.
 */
import { PickerLogic } from './pickerLogic.js';

export class AnimationEngine {
    constructor(trackElement, cardWidth, gap) {
        this.track = trackElement;
        this.cardWidth = cardWidth;
        this.gap = gap;
        this.itemSize = cardWidth + gap;
        
        this.isSpinning = false;
        this.velocity = 0;
        this.position = 0;
        this.targetPosition = 0;
        
        this.onTick = null; // Callback for sound
        this.onFinish = null; // Callback for winner calculation
        
        // Track the last passed index to trigger tick sounds
        this.lastIndex = 0;
    }

    reset() {
        this.position = 0;
        this.track.style.transform = `translateX(0px)`;
    }

    /**
     * Start the spin animation
     * @param {Object} winner - The pre-determined winner object
     * @param {Array} trackList - The full list of cards to render
     * @param {Number} winnerIndex - The index of the winner in the trackList
     */
    spin(winnerIndex, duration = 6000) {
        if (this.isSpinning) return;
        this.isSpinning = true;
        
        // Initial setup
        const startPosition = 0; // Assuming we reset to 0 before spin
        // Calculate target location
        // The marker is at center. 0 position means the LEFT EDGE of the first card is at center (minus offset).
        // Actually, let's align: 
        // We want the winner card CENTER to trigger.
        // If track is centered at 50% screen, and translateX moves it left.
        
        // Logic:
        // By default CSS centers the track. 
        // position 0 = Card 0 is centered.
        // position N * itemSize = Card N is centered.
        // We want to move to - (winnerIndex * itemSize).
        // Plus some randomness to land not perfectly in center? (Optional polish).
        
        // For accurate loop landing:
        // We want to travel a specific huge distance.
        // Let's use a physics emulation or a bezier curve for position.
        
        // Bezier Ease approach (simpler to control duration):
        // t goes from 0 to 1 over duration.
        // pos goes from 0 to targetX.
        
        this.targetPosition = -(winnerIndex * this.itemSize);
        // Add a random offset within the card (-40% to +40%) to make it feel "analog"
        const jitter = (Math.random() * 0.8 - 0.4) * this.cardWidth;
        this.targetPosition += jitter;

        const startTime = performance.now();
        
        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Custom Easing: Cubic Bezier (0.22, 1, 0.36, 1) - "Out Quint" feel
            // 1 - pow(1 - x, 4) is generally good for "spin" stopping
            const ease = 1 - Math.pow(1 - progress, 4);
            
            const currentPos = startPosition + (this.targetPosition - startPosition) * ease;
            
            this.track.style.transform = `translateX(${currentPos}px)`;
            
            // Sound Trigger Logic
            // Calculate which card index is passing the center
            const rawIndex = Math.abs(currentPos / this.itemSize);
            const visibleIndex = Math.floor(rawIndex);
            
            if (visibleIndex > this.lastIndex) {
               if (this.onTick) this.onTick();
               this.lastIndex = visibleIndex;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                if (this.onFinish) this.onFinish();
            }
        };

        requestAnimationFrame(animate);
    }
}
