export class UIManager {
    constructor(game) {
        this.game = game;
        
        // Screens
        this.startScreen = document.getElementById('start-screen');
        this.upgradeScreen = document.getElementById('upgrade-screen');
        this.winScreen = document.getElementById('win-screen');
        this.loseScreen = document.getElementById('lose-screen');
        this.hud = document.getElementById('hud');
        this.container = document.getElementById('game-container');
        
        // HUD elements
        this.levelDisplay = document.getElementById('level-display');
        this.coinDisplay = document.getElementById('coin-display');
        this.countDisplay = document.getElementById('count-display');
        
        // Upgrade elements
        this.crowdLevel = document.getElementById('crowd-level');
        this.strengthLevel = document.getElementById('strength-level');
        this.upgradeCrowdBtn = document.getElementById('upgrade-crowd-btn');
        this.upgradeStrengthBtn = document.getElementById('upgrade-strength-btn');
        
        // Shake state
        this.shakeIntensity = 0;
        this.canvas = document.getElementById('game-canvas');
        
        // Previous count for pulse animation
        this.prevCount = 0;
        
        this.setupButtons();
        this.updateHUDInfo();
        this.startShakeLoop();
    }

    setupButtons() {
        document.getElementById('play-btn').addEventListener('click', () => {
            this.game.audio.init();
            this.game.audio.playClick();
            this.transitionOut(this.startScreen, () => {
                this.game.startGame();
            });
        });

        document.getElementById('upgrade-btn').addEventListener('click', () => {
            this.game.audio.init();
            this.game.audio.playClick();
            this.transitionOut(this.startScreen, () => {
                this.showUpgrades();
            });
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            if (this.game.audio.initialized) this.game.audio.playClick();
            this.transitionOut(this.upgradeScreen, () => {
                this.transitionIn(this.startScreen);
            });
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            if (this.game.audio.initialized) this.game.audio.playClick();
            this.transitionOut(this.winScreen, () => {
                this.game.startGame();
            });
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            if (this.game.audio.initialized) this.game.audio.playClick();
            this.transitionOut(this.loseScreen, () => {
                this.game.startGame();
            });
        });

        this.upgradeCrowdBtn.addEventListener('click', () => {
            if (this.game.upgradecrowd()) {
                if (this.game.audio.initialized) this.game.audio.playGateGood();
                this.updateUpgradeScreen();
                this.updateHUDInfo();
                this.pulseElement(this.upgradeCrowdBtn);
            }
        });

        this.upgradeStrengthBtn.addEventListener('click', () => {
            if (this.game.upgradeStrength()) {
                if (this.game.audio.initialized) this.game.audio.playGateGood();
                this.updateUpgradeScreen();
                this.updateHUDInfo();
                this.pulseElement(this.upgradeStrengthBtn);
            }
        });
    }

    // ============ TRANSITIONS ============
    transitionOut(element, callback) {
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.9)';
        setTimeout(() => {
            element.classList.add('hidden');
            element.style.opacity = '';
            element.style.transform = '';
            element.style.transition = '';
            if (callback) callback();
        }, 300);
    }

    transitionIn(element) {
        element.style.opacity = '0';
        element.style.transform = 'scale(1.1)';
        element.classList.remove('hidden');
        requestAnimationFrame(() => {
            element.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            element.style.opacity = '1';
            element.style.transform = 'scale(1)';
            setTimeout(() => {
                element.style.transition = '';
            }, 400);
        });
    }

    // ============ SCREEN SHAKE ============
    screenShake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    startShakeLoop() {
        const loop = () => {
            if (this.shakeIntensity > 0.5) {
                const x = (Math.random() - 0.5) * this.shakeIntensity;
                const y = (Math.random() - 0.5) * this.shakeIntensity;
                this.canvas.style.transform = `translate(${x}px, ${y}px)`;
                this.shakeIntensity *= 0.85;
            } else {
                this.shakeIntensity = 0;
                this.canvas.style.transform = '';
            }
            requestAnimationFrame(loop);
        };
        loop();
    }

    // ============ FLOATING TEXT ============
    showFloatingText(text, color) {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = `
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            font-weight: bold;
            color: ${color};
            text-shadow: 0 0 10px ${color}, 0 2px 4px rgba(0,0,0,0.5);
            pointer-events: none;
            z-index: 50;
            animation: floatUp 0.8s ease-out forwards;
        `;
        this.container.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    // ============ PULSE ANIMATION ============
    pulseElement(el) {
        el.style.transform = 'scale(1.3)';
        el.style.transition = 'transform 0.15s ease';
        setTimeout(() => {
            el.style.transform = 'scale(1)';
            setTimeout(() => { el.style.transition = ''; }, 150);
        }, 150);
    }

    // ============ STANDARD UI ============
    hideAllScreens() {
        this.startScreen.classList.add('hidden');
        this.upgradeScreen.classList.add('hidden');
        this.winScreen.classList.add('hidden');
        this.loseScreen.classList.add('hidden');
        this.hud.style.display = 'none';
    }

    showHUD() {
        this.hud.style.display = 'flex';
        this.hud.style.opacity = '0';
        requestAnimationFrame(() => {
            this.hud.style.transition = 'opacity 0.5s ease';
            this.hud.style.opacity = '1';
            setTimeout(() => { this.hud.style.transition = ''; }, 500);
        });
        this.updateHUDInfo();
    }

    updateHUDInfo() {
        this.levelDisplay.textContent = `Level ${this.game.level}`;
        this.coinDisplay.textContent = `🪙 ${this.game.coins}`;
    }

    updateCount(count) {
        this.countDisplay.textContent = `👥 ${count}`;
        // Pulse the count display when count changes significantly
        if (Math.abs(count - this.prevCount) > 2) {
            this.countDisplay.style.transform = 'scale(1.3)';
            this.countDisplay.style.transition = 'transform 0.15s ease';
            setTimeout(() => {
                this.countDisplay.style.transform = 'scale(1)';
                setTimeout(() => { this.countDisplay.style.transition = ''; }, 150);
            }, 150);
        }
        this.prevCount = count;
    }

    showUpgrades() {
        this.transitionIn(this.upgradeScreen);
        this.updateUpgradeScreen();
    }

    updateUpgradeScreen() {
        this.crowdLevel.textContent = `Lv. ${this.game.crowdUpgrade}`;
        this.strengthLevel.textContent = `Lv. ${this.game.strengthUpgrade}`;
        this.upgradeCrowdBtn.textContent = `🪙 ${this.game.crowdUpgrade * 50}`;
        this.upgradeStrengthBtn.textContent = `🪙 ${this.game.strengthUpgrade * 75}`;
        this.coinDisplay.textContent = `🪙 ${this.game.coins}`;
    }

    showWin(coins) {
        this.hideAllScreens();
        setTimeout(() => {
            this.transitionIn(this.winScreen);
            document.getElementById('win-coins').textContent = `+${coins} 🪙`;
            // Confetti burst
            this.spawnConfetti();
        }, 300);
    }

    showLose() {
        this.hideAllScreens();
        setTimeout(() => {
            this.transitionIn(this.loseScreen);
        }, 300);
    }

    // ============ CONFETTI ============
    spawnConfetti() {
        const colors = ['#FF5252', '#FFD740', '#69F0AE', '#40C4FF', '#E040FB', '#FF6E40'];
        for (let i = 0; i < 40; i++) {
            const confetti = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const delay = Math.random() * 0.5;
            const size = 6 + Math.random() * 8;
            confetti.style.cssText = `
                position: absolute;
                top: -10px;
                left: ${left}%;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                pointer-events: none;
                z-index: 200;
                animation: confettiFall ${1.5 + Math.random()}s ease-in ${delay}s forwards;
                transform: rotate(${Math.random() * 360}deg);
            `;
            this.container.appendChild(confetti);
            setTimeout(() => confetti.remove(), 2500);
        }
    }
}
