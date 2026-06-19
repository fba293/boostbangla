// ============================================
// BoostBangla Confetti Animation Library - Premium Design System v3.0
// Beautiful celebration effects for order completion, deposits, milestones
// Fully responsive with touch optimization and dark mode support
// Version: 3.0
// ============================================

class Confetti {
    constructor(options = {}) {
        this.options = {
            duration: 3000,
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            startVelocity: 20,
            decay: 0.95,
            gravity: 0.6,
            colors: ['#FF6B00', '#CC4D02', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'],
            shapes: ['square', 'circle', 'rectangle'],
            soundEnabled: true,
            hapticEnabled: true,
            ...options
        };
        
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
        this.isRunning = false;
        this.startTime = null;
        
        this.init();
    }
    
    // Initialize with design system styling
    init() {
        this.injectStyles();
    }
    
    injectStyles() {
        if (document.querySelector('#confetti-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            .confetti-canvas {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 99999;
                transition: opacity 0.3s ease;
            }
            
            .celebration-message {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #FF6B00, #CC5500);
                color: white;
                padding: 20px 40px;
                border-radius: 60px;
                font-size: 1.25rem;
                font-weight: 800;
                z-index: 100000;
                white-space: nowrap;
                box-shadow: var(--card-shadow-xl, 0 35px 45px -12px rgba(0,0,0,0.3));
                animation: celebrationPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                font-family: 'Inter', sans-serif;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
            }
            
            .celebration-message-small {
                padding: 12px 24px;
                font-size: 1rem;
                white-space: normal;
                max-width: 80vw;
                text-align: center;
                line-height: 1.4;
            }
            
            @keyframes celebrationPop {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            @keyframes celebrationFadeOut {
                from {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }
            
            .confetti-particle {
                position: absolute;
                will-change: transform;
            }
            
            /* Mobile optimization */
            @media (max-width: 768px) {
                .celebration-message {
                    padding: 14px 28px;
                    font-size: 1rem;
                    border-radius: 50px;
                }
            }
            
            @media (max-width: 480px) {
                .celebration-message {
                    padding: 12px 20px;
                    font-size: 0.875rem;
                    white-space: normal;
                    text-align: center;
                    max-width: 85vw;
                    line-height: 1.3;
                }
            }
            
            /* Dark mode adjustment */
            body.dark-mode .celebration-message {
                background: linear-gradient(135deg, #FF6B00, #CC5500);
                box-shadow: 0 35px 45px -12px rgba(255, 107, 0, 0.3);
            }
            
            /* Reduced motion preference */
            @media (prefers-reduced-motion: reduce) {
                .celebration-message {
                    animation: none;
                }
                .confetti-canvas {
                    display: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Create canvas with design system styling
    createCanvas() {
        if (this.canvas) return;
        
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'confetti-canvas';
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.ctx = this.canvas.getContext('2d');
        document.body.appendChild(this.canvas);
        
        // Handle resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resizeCanvas(), 100);
        });
    }
    
    resizeCanvas() {
        if (this.canvas && this.isRunning) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }
    
    // Create particles with enhanced visual effects
    createParticles() {
        const particles = [];
        const count = this.options.particleCount;
        const centerX = this.canvas.width * this.options.origin.x;
        const centerY = this.canvas.height * this.options.origin.y;
        
        for (let i = 0; i < count; i++) {
            const color = this.options.colors[Math.floor(Math.random() * this.options.colors.length)];
            const shape = this.options.shapes[Math.floor(Math.random() * this.options.shapes.length)];
            const angle = Math.random() * Math.PI * 2;
            const velocity = this.options.startVelocity + Math.random() * 15;
            
            // Spread based on origin
            const spreadX = (Math.random() - 0.5) * this.options.spread;
            const spreadY = (Math.random() - 0.5) * this.options.spread * 0.5;
            
            const vx = Math.cos(angle) * velocity * (Math.random() - 0.5) + spreadX;
            const vy = Math.sin(angle) * velocity - 8 + spreadY;
            
            particles.push({
                x: centerX + (Math.random() - 0.5) * 60,
                y: centerY + (Math.random() - 0.5) * 40,
                vx: vx,
                vy: vy,
                size: 5 + Math.random() * 8,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 20,
                color: color,
                opacity: 0.9 + Math.random() * 0.1,
                shape: shape,
                gravity: this.options.gravity * (0.8 + Math.random() * 0.6),
                drag: this.options.decay,
                trail: Math.random() > 0.7
            });
        }
        
        return particles;
    }
    
    // Draw particle with enhanced effects
    drawParticle(particle) {
        this.ctx.save();
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.rotation * Math.PI / 180);
        this.ctx.globalAlpha = particle.opacity;
        this.ctx.fillStyle = particle.color;
        this.ctx.shadowBlur = 0;
        
        const size = particle.size;
        
        switch (particle.shape) {
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'rectangle':
                this.ctx.fillRect(-size / 2, -size / 3, size, size * 0.6);
                break;
            case 'square':
            default:
                this.ctx.fillRect(-size / 2, -size / 2, size, size);
                break;
        }
        
        // Add trail effect for some particles
        if (particle.trail && particle.opacity > 0.5) {
            this.ctx.globalAlpha = particle.opacity * 0.3;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(-size / 1.5, -size / 1.5, size * 1.2, size * 1.2);
        }
        
        this.ctx.restore();
    }
    
    // Update particle physics with enhanced realism
    updateParticle(particle) {
        particle.vx *= particle.drag;
        particle.vy *= particle.drag;
        particle.vy += particle.gravity;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.rotationSpeed;
        particle.opacity -= 0.008;
        
        // Add slight wind effect
        if (Math.random() > 0.99) {
            particle.vx += (Math.random() - 0.5) * 0.2;
        }
        
        return particle.opacity > 0.02 && 
               particle.y < this.canvas.height + 200 && 
               particle.y > -200 &&
               particle.x < this.canvas.width + 200 &&
               particle.x > -200;
    }
    
    // Animate confetti with smooth 60fps
    animate() {
        if (!this.isRunning) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add subtle gradient background effect
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.05)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles = this.particles.filter(particle => this.updateParticle(particle));
        this.particles.forEach(particle => this.drawParticle(particle));
        
        // Check if celebration should end
        const elapsed = Date.now() - this.startTime;
        if (this.particles.length === 0 || elapsed > this.options.duration) {
            this.stop();
        } else {
            this.animationId = requestAnimationFrame(() => this.animate());
        }
    }
    
    // Trigger haptic feedback (mobile)
    triggerHaptic() {
        if (!this.options.hapticEnabled) return;
        
        if ('vibrate' in navigator && window.innerWidth <= 768) {
            navigator.vibrate(100);
            setTimeout(() => {
                if ('vibrate' in navigator) navigator.vibrate(50);
            }, 150);
        }
    }
    
    // Play celebration sound
    playSound() {
        if (!this.options.soundEnabled) return;
        
        try {
            // Create subtle celebration sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
            oscillator.stop(audioContext.currentTime + 0.5);
            
            // Second note
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.value = 1046.50;
                gain2.gain.value = 0.08;
                osc2.start();
                gain2.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.4);
                osc2.stop(audioContext.currentTime + 0.4);
            }, 150);
            
        } catch (e) {
            // Audio not supported, silent celebration
        }
    }
    
    // Start confetti animation
    start() {
        if (this.isRunning) this.stop();
        
        this.createCanvas();
        this.particles = this.createParticles();
        this.isRunning = true;
        this.startTime = Date.now();
        this.animate();
        
        // Trigger haptic on mobile
        this.triggerHaptic();
        
        // Play sound
        this.playSound();
    }
    
    // Stop confetti animation
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.canvas && this.canvas.parentNode) {
            // Fade out effect
            this.canvas.style.opacity = '0';
            setTimeout(() => {
                if (this.canvas && this.canvas.parentNode) {
                    this.canvas.parentNode.removeChild(this.canvas);
                    this.canvas = null;
                }
            }, 300);
        }
    }
}

// ============================================
// Predefined Celebration Effects
// ============================================

// Standard order celebration
function celebrateOrder() {
    const confetti = new Confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#FF6B00', '#CC4D02', '#10b981', '#3b82f6', '#8b5cf6'],
        duration: 3500
    });
    confetti.start();
    
    // Track celebration
    if (typeof getAnalytics === 'function') {
        const analytics = getAnalytics();
        analytics.track('celebration', { type: 'order' });
    }
}

// Deposit celebration
function celebrateDeposit(amount = null) {
    const confetti = new Confetti({
        particleCount: 180,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#059669', '#FF6B00'],
        duration: 3000
    });
    confetti.start();
    
    if (amount && typeof getAnalytics === 'function') {
        const analytics = getAnalytics();
        analytics.track('celebration', { type: 'deposit', amount: amount });
    }
}

// Milestone celebration (scales with value)
function celebrateMilestone(milestone, value) {
    // Scale celebration intensity based on milestone size
    const intensity = Math.min(Math.floor(value / 1000), 5);
    const particleCount = 150 + (intensity * 50);
    const duration = 3000 + (intensity * 500);
    
    const confetti = new Confetti({
        particleCount: Math.min(particleCount, 500),
        spread: 80 + (intensity * 10),
        origin: { y: 0.5 },
        colors: ['#FF6B00', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
        duration: duration,
        startVelocity: 20 + (intensity * 3)
    });
    confetti.start();
    
    // Show milestone message
    celebrateWithMessage(`${milestone}: ${value.toLocaleString()}!`, Math.min(duration, 4000));
    
    if (typeof getAnalytics === 'function') {
        const analytics = getAnalytics();
        analytics.track('celebration', { type: 'milestone', milestone: milestone, value: value });
    }
}

// Special occasion celebration (birthday, anniversary, etc.)
function celebrateSpecial(eventType = 'special') {
    const confetti = new Confetti({
        particleCount: 350,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#FF6B00', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'],
        duration: 5000,
        startVelocity: 25
    });
    confetti.start();
    
    if (typeof getAnalytics === 'function') {
        const analytics = getAnalytics();
        analytics.track('celebration', { type: 'special', event: eventType });
    }
}

// Cascade confetti from top (like falling snow)
function cascadeConfetti() {
    const confetti = new Confetti({
        particleCount: 400,
        spread: 150,
        origin: { y: 0 },
        startVelocity: 10,
        gravity: 0.4,
        colors: ['#FF6B00', '#CC4D02', '#f59e0b', '#ef4444', '#10b981'],
        duration: 4000
    });
    confetti.start();
}

// Fireworks style (multiple bursts)
function fireworkConfetti() {
    for (let i = 0; i < 4; i++) {
        setTimeout(() => {
            const confetti = new Confetti({
                particleCount: 120,
                spread: 50,
                origin: { 
                    y: 0.2 + Math.random() * 0.6,
                    x: 0.3 + Math.random() * 0.4
                },
                startVelocity: 25,
                colors: ['#FF6B00', '#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
                duration: 2000
            });
            confetti.start();
        }, i * 250);
    }
}

// Quick celebration for small achievements
function quickCelebration() {
    const confetti = new Confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FF6B00', '#10b981'],
        duration: 1500,
        startVelocity: 15
    });
    confetti.start();
}

// Confetti with custom message
function celebrateWithMessage(message, duration = 3000, isMobileOptimized = true) {
    const confetti = new Confetti({ duration: duration });
    confetti.start();
    
    // Create floating message
    const toast = document.createElement('div');
    toast.className = `celebration-message ${isMobileOptimized && window.innerWidth <= 480 ? 'celebration-message-small' : ''}`;
    toast.textContent = message;
    
    // Add icon based on message content
    let icon = '🎉';
    if (message.toLowerCase().includes('deposit') || message.toLowerCase().includes('added')) icon = '💰';
    if (message.toLowerCase().includes('order')) icon = '📦';
    if (message.toLowerCase().includes('milestone')) icon = '🏆';
    if (message.toLowerCase().includes('welcome')) icon = '👋';
    
    toast.innerHTML = `${icon} ${message}`;
    
    document.body.appendChild(toast);
    
    // Auto-remove with animation
    setTimeout(() => {
        toast.style.animation = 'celebrationFadeOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, duration - 500);
}

// Order completion celebration (enhanced)
function celebrateOrderCompletion(orderId, serviceName, totalAmount = null) {
    // Scale celebration based on order value
    let config = {
        particleCount: 250,
        spread: 100,
        origin: { y: 0.5 },
        duration: 4000
    };
    
    if (totalAmount && totalAmount > 500) {
        config.particleCount = 350;
        config.duration = 5000;
    }
    
    const confetti = new Confetti(config);
    confetti.start();
    
    const message = totalAmount 
        ? `🎉 Order #${orderId} Complete! ৳${totalAmount.toLocaleString()}`
        : `🎉 Order #${orderId} Completed!`;
    
    celebrateWithMessage(message, 3500);
    
    // Track celebration
    if (typeof getAnalytics === 'function') {
        const analytics = getAnalytics();
        analytics.track('order_celebration', { 
            orderId: orderId, 
            serviceName: serviceName,
            totalAmount: totalAmount
        });
    }
}

// Deposit approval celebration
function celebrateDepositApproval(amount) {
    const confetti = new Confetti({
        particleCount: 220,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#059669', '#FF6B00'],
        duration: 3500
    });
    confetti.start();
    
    celebrateWithMessage(`💰 ৳${amount.toLocaleString()} Added to Balance!`, 3000);
    
    if (typeof getAnalytics === 'function') {
        const analytics = getAnalytics();
        analytics.track('deposit_celebration', { amount: amount });
    }
}

// Welcome celebration for new users
function celebrateNewUser(userName = 'User') {
    const confetti = new Confetti({
        particleCount: 300,
        spread: 110,
        origin: { y: 0.5 },
        colors: ['#FF6B00', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
        duration: 4500,
        startVelocity: 22
    });
    confetti.start();
    
    celebrateWithMessage(`👋 Welcome to BoostBangla, ${userName}!`, 4000);
    
    if (typeof getAnalytics === 'function') {
        const analytics = getAnalytics();
        analytics.track('welcome_celebration', { userName: userName });
    }
}

// Level up celebration
function celebrateLevelUp(level, points = null) {
    const confetti = new Confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#8b5cf6', '#a78bfa', '#c084fc', '#FF6B00'],
        duration: 3500
    });
    confetti.start();
    
    const message = points 
        ? `⭐ Level ${level} Unlocked! +${points.toLocaleString()} points`
        : `⭐ Congratulations! You've reached Level ${level}!`;
    
    celebrateWithMessage(message, 3500);
    
    if (typeof getAnalytics === 'function') {
        const analytics = getAnalytics();
        analytics.track('level_up_celebration', { level: level, points: points });
    }
}

// ============================================
// Canvas Confetti Fallback (lighter)
// ============================================

function simpleConfetti() {
    // Check if canvas confetti library is available
    if (typeof window.canvasConfetti === 'function') {
        window.canvasConfetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FF6B00', '#CC4D02', '#10b981']
        });
    } else {
        const confetti = new Confetti({ 
            particleCount: 100,
            soundEnabled: false,
            hapticEnabled: false
        });
        confetti.start();
    }
}

// ============================================
// Automatic Celebration Triggers
// ============================================

function setupAutoCelebration() {
    // Listen for order status changes
    if (typeof db !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                db.collection('orders')
                    .where('userId', '==', user.uid)
                    .where('status', '==', 'completed')
                    .onSnapshot((snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'modified') {
                                const order = change.doc.data();
                                const oldStatus = change.doc.data().previousStatus;
                                if (oldStatus !== 'completed') {
                                    celebrateOrderCompletion(
                                        change.doc.id, 
                                        order.serviceName,
                                        order.total || order.price * order.quantity
                                    );
                                }
                            }
                        });
                    });
            }
        });
    }
}

// ============================================
// Celebration Intensity Control
// ============================================

class CelebrationController {
    constructor() {
        this.isEnabled = localStorage.getItem('celebrations_enabled') !== 'false';
        this.intensity = localStorage.getItem('celebration_intensity') || 'normal';
    }
    
    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('celebrations_enabled', enabled);
    }
    
    setIntensity(intensity) {
        const validIntensities = ['low', 'normal', 'high', 'extreme'];
        if (validIntensities.includes(intensity)) {
            this.intensity = intensity;
            localStorage.setItem('celebration_intensity', intensity);
        }
    }
    
    getConfig() {
        if (!this.isEnabled) return null;
        
        const configs = {
            low: { particleMultiplier: 0.5, soundEnabled: false, hapticEnabled: false },
            normal: { particleMultiplier: 1, soundEnabled: true, hapticEnabled: true },
            high: { particleMultiplier: 1.5, soundEnabled: true, hapticEnabled: true },
            extreme: { particleMultiplier: 2, soundEnabled: true, hapticEnabled: true }
        };
        
        return configs[this.intensity];
    }
    
    celebrate(type, options = {}) {
        const config = this.getConfig();
        if (!config) return;
        
        const multiplier = config.particleMultiplier;
        const soundEnabled = config.soundEnabled;
        const hapticEnabled = config.hapticEnabled;
        
        switch(type) {
            case 'order':
                celebrateOrder();
                break;
            case 'deposit':
                celebrateDeposit(options.amount);
                break;
            case 'milestone':
                celebrateMilestone(options.milestone, options.value);
                break;
            case 'special':
                celebrateSpecial(options.event);
                break;
            default:
                celebrateOrder();
        }
    }
}

const celebrationController = new CelebrationController();

// ============================================
// Export functions for global use
// ============================================

window.Confetti = Confetti;
window.celebrationController = celebrationController;
window.celebrateOrder = celebrateOrder;
window.celebrateDeposit = celebrateDeposit;
window.celebrateMilestone = celebrateMilestone;
window.celebrateSpecial = celebrateSpecial;
window.cascadeConfetti = cascadeConfetti;
window.fireworkConfetti = fireworkConfetti;
window.quickCelebration = quickCelebration;
window.simpleConfetti = simpleConfetti;
window.celebrateWithMessage = celebrateWithMessage;
window.celebrateOrderCompletion = celebrateOrderCompletion;
window.celebrateDepositApproval = celebrateDepositApproval;
window.celebrateNewUser = celebrateNewUser;
window.celebrateLevelUp = celebrateLevelUp;
window.setupAutoCelebration = setupAutoCelebration;

// ============================================
// Auto-initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion && celebrationController.isEnabled) {
        celebrationController.setEnabled(false);
    }
    
    console.log('🎉 BoostBangla Confetti v3.0 loaded - Design System Ready');
    console.log('💡 Tip: Use celebrationController.setIntensity("low"/"normal"/"high"/"extreme") to adjust effects');
});

// ============================================
// Module exports for Node.js
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        Confetti, 
        CelebrationController,
        celebrateOrder,
        celebrateDeposit,
        celebrateMilestone,
        celebrateSpecial,
        celebrateOrderCompletion,
        celebrateDepositApproval,
        celebrateNewUser,
        celebrateLevelUp,
        setupAutoCelebration
    };
}