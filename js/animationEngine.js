/**
 * Handles the linear motion animation for the picker.
 * Uses requestAnimationFrame for smooth 60fps performance.
 */
export class AnimationEngine {
    constructor(trackElement, cardWidth, gap) {
        this.track = trackElement;
        this.cardWidth = cardWidth;
        this.gap = gap;
        this.itemSize = cardWidth + gap;
        
        this.isSpinning = false;
        this.position = 0;
        
        // Idle System
        this.isIdle = false;
        this.idleSpeed = 0.5; // pixels per frame
        this.idleReqId = null;
        
        this.onTick = null; // Callback for sound
        this.onFinish = null; // Callback for winner calculation
        this.onCardExit = null; // Callback when a card leaves the left side (for infinite loop)
        
        this.lastIndex = 0;
    }

    startIdle() {
        if (this.isSpinning || this.isIdle) return;
        this.isIdle = true;
        this.lastTime = performance.now();
        this._idleLoop();
    }
    
    stopIdle() {
        this.isIdle = false;
        if (this.idleReqId) cancelAnimationFrame(this.idleReqId);
    }

    _idleLoop() {
        if (!this.isIdle) return;

        // Move position
        this.position -= this.idleSpeed;
        
        // Check for card exit
        // If position moves by itemSize, it means one card has fully left
        // We can treat position relative to a virtual infinite track
        // But for DOM, we just move `translateX`.
        // To keep DOM manageable, we rely on Main.js to append cards and reset offset if needed.
        // Actually, let's just let it drift and notify Main.js to reshuffle DOM if it gets too far?
        // Better: Notify every time a card crosses -itemSize.
        
        // Logic: Main.js creates a buffer. We just scroll.
        this.track.style.transform = `translateX(${this.position}px)`;

        // Check if we crossed a card boundary
        const index = Math.floor(Math.abs(this.position) / this.itemSize);
        if (index > this.lastIndex) {
             // Card passed
             this.lastIndex = index;
             if(this.onCardExit) this.onCardExit();
        }

        this.idleReqId = requestAnimationFrame(() => this._idleLoop());
    }

    /**
     * Rapid scrolling effect for "Shuffle" phase
     */
    visualShuffle(speed = 30) {
        // Just really fast idle loop
        this.isIdle = true;
        this.idleSpeed = speed; // High speed
        if(!this.idleReqId) this._idleLoop();
    }

    resetIdleSpeed() {
        this.idleSpeed = 0.5;
    }

    /**
     * seamless transition from idle to spin
     */
    spinFromIdle(targetIndex, duration = 6000, theme = 'standard') {
        this.isSpinning = true;
        this.isIdle = false;
        
        const startPos = this.position;
        
        // Dynamic Center Alignment
        // The track CSS has `left: 50%`, so x=0 is the visual center of viewport.
        // We want the Center of the Target Card to be at x=0.
        // Card Center relative to Track Start = (Index * ItemSize) + (CardWidth / 2).
        // To bring that point to 0, we must translate by negative that amount.
        
        const cardCenterOffset = (targetIndex * this.itemSize) + (this.cardWidth / 2);
        this.targetPosition = -cardCenterOffset;
        
        this.startTime = null;
        this.duration = duration;
        this.startPosition = startPos;
        this.easing = theme; // Store theme to select algo
        
        cancelAnimationFrame(this.rafId);
        
        const startTime = performance.now();
        
        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            let ease;
            
            switch(theme) {
                case 'suspenseful':
                    // Very slow end
                    // Quartic out with an extended tail? simply longer duration handled by caller?
                    // Let's use specific bezier: fast start, VEERY slow creep
                    // Bezier(0.1, 0.9, 0.1, 1.0)
                   ease = 1 - Math.pow(1 - progress, 6); // Quintic+
                   break;
                case 'dramatic':
                    // Fast start, sudden brake, slow finish
                    // Exponential out
                    ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                    break;
                case 'playful':
                    // Elastic out
                    const c4 = (2 * Math.PI) / 3;
                    ease = progress === 0 ? 0 : progress === 1 ? 1 : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;
                    break;
                case 'funny':
                    // Back out (Overshoot)
                     const c1 = 1.70158;
                     const c3 = c1 + 1;
                     ease = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
                     break;
                case 'standard':
                default:
                    // Cubic Out
                    ease = 1 - Math.pow(1 - progress, 3);
            }
            
            const currentPos = startPos + (this.targetPosition - startPos) * ease;
            
            this.track.style.transform = `translateX(${currentPos}px)`;
            
            // Sound
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
