import * as THREE from 'three';
import { LevelGenerator } from './level.js';
import { CrowdManager } from './crowd.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Game state
        this.state = 'menu'; // menu, playing, fighting, win, lose
        this.level = 1;
        this.coins = 0;
        this.crowdUpgrade = 1;
        this.strengthUpgrade = 1;
        
        // Skins & Themes
        this.skins = [
            { id: 'blue', name: 'Classic Blue', color: 0x2196F3, price: 0, owned: true },
            { id: 'green', name: 'Forest', color: 0x4CAF50, price: 10, owned: false },
            { id: 'orange', name: 'Sunset', color: 0xFF9800, price: 10, owned: false },
            { id: 'purple', name: 'Royal', color: 0x9C27B0, price: 15, owned: false },
            { id: 'pink', name: 'Bubblegum', color: 0xE91E63, price: 15, owned: false },
            { id: 'cyan', name: 'Ice', color: 0x00BCD4, price: 20, owned: false },
            { id: 'yellow', name: 'Gold', color: 0xFFEB3B, price: 20, owned: false },
            { id: 'white', name: 'Ghost', color: 0xFFFFFF, price: 25, owned: false },
            { id: 'black', name: 'Shadow', color: 0x333333, price: 25, owned: false },
            { id: 'rainbow', name: 'Rainbow', color: 0xFF1744, price: 0, owned: false, shareUnlock: true },
        ];
        this.equippedSkin = 'blue';
        
        this.themes = [
            { id: 'default', name: 'Day', colors: ['#1a0533','#4a90d9','#87CEEB','#b8e4f0','#f0f8ff'], fog: 0xb8e4f0, ground: 0x66BB6A, price: 0, owned: true },
            { id: 'sunset', name: 'Sunset', colors: ['#1a0011','#ff6b35','#ff8c61','#ffc89e','#fff3e0'], fog: 0xffc89e, ground: 0x8D6E63, price: 15, owned: false },
            { id: 'night', name: 'Night', colors: ['#000011','#0d1b2a','#1b2838','#2d4059','#3d5a80'], fog: 0x1b2838, ground: 0x2E7D32, price: 15, owned: false },
            { id: 'candy', name: 'Candy', colors: ['#4a0072','#c51162','#ff6090','#ff80ab','#ffe0f0'], fog: 0xff80ab, ground: 0x81C784, price: 20, owned: false },
            { id: 'ocean', name: 'Ocean', colors: ['#001a33','#003366','#006699','#3399cc','#99ccff'], fog: 0x3399cc, ground: 0x26A69A, price: 20, owned: false },
            { id: 'volcano', name: 'Volcano', colors: ['#1a0000','#4d0000','#800000','#cc3300','#ff6600'], fog: 0xcc3300, ground: 0x5D4037, price: 25, owned: false },
        ];
        this.equippedTheme = 'default';
        
        // Fighting state
        this.fightingEnemy = null;
        this.fightTimer = 0;
        this.fightInterval = 0.12; // Time between each stickman removal
        
        // Player
        this.playerCrowd = null;
        this.playerX = 0;
        this.speed = 9;
        this.trackZ = 0;
        
        // Level
        this.levelGenerator = null;
        this.trackLength = 200;
        
        // Input
        this.inputX = 0;
        this.isDragging = false;
        this.lastInputX = 0;
        
        // Load saved data
        this.loadProgress();
    }

    init() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupInput();
        
        this.ui = new UIManager(this);
        this.crowdManager = new CrowdManager(this.scene, this);
        this.levelGenerator = new LevelGenerator(this.scene, this);
        this.audio = new AudioManager();
        
        this.animate();
    }

    setupRenderer() {
        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }

    setupScene() {
        this.scene = new THREE.Scene();
        
        // Apply active theme (gradient sky + fog)
        this.applyTheme();
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        this.camera.position.set(0, 12, 15);
        this.camera.lookAt(0, 0, -10);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xfff5e0, 1.0);
        directional.position.set(10, 20, 10);
        directional.castShadow = true;
        directional.shadow.mapSize.set(2048, 2048);
        directional.shadow.camera.near = 0.5;
        directional.shadow.camera.far = 100;
        directional.shadow.camera.left = -30;
        directional.shadow.camera.right = 30;
        directional.shadow.camera.top = 30;
        directional.shadow.camera.bottom = -30;
        this.scene.add(directional);
        this.directionalLight = directional;

        // Sun sphere
        const sunGeo = new THREE.SphereGeometry(3, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFEB3B });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(40, 45, -80);
        this.scene.add(sun);

        // Sun glow
        const glowGeo = new THREE.SphereGeometry(5, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({ 
            color: 0xFFF9C4, 
            transparent: true, 
            opacity: 0.3 
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(40, 45, -80);
        this.scene.add(glow);

        // Hemisphere light for natural outdoor feel
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x66BB6A, 0.3);
        this.scene.add(hemi);
    }

    setupInput() {
        const canvas = this.renderer.domElement;
        
        // Mouse
        canvas.addEventListener('mousedown', (e) => {
            if (this.state !== 'playing') return;
            this.isDragging = true;
            this.lastInputX = e.clientX;
        });
        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging || this.state !== 'playing') return;
            const deltaX = (e.clientX - this.lastInputX) * 0.02;
            this.playerX = Math.max(-3.5, Math.min(3.5, this.playerX + deltaX));
            this.lastInputX = e.clientX;
        });
        canvas.addEventListener('mouseup', () => { this.isDragging = false; });
        canvas.addEventListener('mouseleave', () => { this.isDragging = false; });

        // Touch
        canvas.addEventListener('touchstart', (e) => {
            if (this.state !== 'playing') return;
            this.isDragging = true;
            this.lastInputX = e.touches[0].clientX;
        }, { passive: true });
        canvas.addEventListener('touchmove', (e) => {
            if (!this.isDragging || this.state !== 'playing') return;
            e.preventDefault();
            const deltaX = (e.touches[0].clientX - this.lastInputX) * 0.02;
            this.playerX = Math.max(-3.5, Math.min(3.5, this.playerX + deltaX));
            this.lastInputX = e.touches[0].clientX;
        }, { passive: false });
        canvas.addEventListener('touchend', () => { this.isDragging = false; });

        // Keyboard
        this.keys = {};
        window.addEventListener('keydown', (e) => { this.keys[e.key] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
    }

    startGame() {
        this.state = 'playing';
        this.trackZ = 0;
        this.playerX = 0;
        this.speed = 9;
        
        // Init and start audio
        this.audio.init();
        this.audio.resume();
        this.audio.startMusic();
        
        // Clear scene objects
        this.clearLevel();
        
        // Generate level
        this.trackLength = 150 + this.level * 30;
        this.levelGenerator.generate(this.level, this.trackLength);
        
        // Create player crowd
        const startCount = this.getStartingCrowdSize();
        this.crowdManager.createPlayerCrowd(startCount);
        
        this.ui.showHUD();
        this.ui.updateCount(startCount);
    }

    getStartingCrowdSize() {
        return 1 + (this.crowdUpgrade - 1) * 3;
    }

    clearLevel() {
        // Remove all dynamic objects
        const toRemove = [];
        this.scene.traverse((obj) => {
            if (obj.userData.dynamic) {
                toRemove.push(obj);
            }
        });
        toRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.crowdManager.clear();
        this.levelGenerator.clear();
    }

    update(delta) {
        if (this.state === 'boss_defeated') {
            this.crowdManager.update(delta);
            this.levelGenerator.updateBossDefeat(delta);
            return;
        }

        if (this.state === 'fighting') {
            this.updateFight(delta);
            this.crowdManager.update(delta);
            this.ui.updateCount(this.crowdManager.getPlayerCount());
            
            // Camera shake and zoom during fight
            this.fightCameraTime = (this.fightCameraTime || 0) + delta;
            const shakeX = Math.sin(this.fightCameraTime * 25) * 0.15;
            const shakeY = Math.cos(this.fightCameraTime * 30) * 0.08;
            this.camera.position.x = this.playerX * 0.3 + shakeX;
            this.camera.position.z = -this.trackZ + 12; // Zoom in closer
            this.camera.position.y = 10 + shakeY;
            this.camera.lookAt(this.playerX * 0.3, 1, -this.trackZ - 5);
            return;
        }

        if (this.state !== 'playing') return;

        // Keyboard input
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            this.playerX = Math.max(-3.5, this.playerX - 8 * delta);
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            this.playerX = Math.min(3.5, this.playerX + 8 * delta);
        }

        // Move forward
        this.trackZ += this.speed * delta;

        // Update crowd position
        this.crowdManager.updatePlayerPosition(this.playerX, -this.trackZ);

        // Update camera
        this.camera.position.x = this.playerX * 0.3;
        this.camera.position.z = -this.trackZ + 15;
        this.camera.lookAt(this.playerX * 0.3, 0, -this.trackZ - 10);

        // Update light position to follow player
        this.directionalLight.position.set(
            this.playerX + 10,
            20,
            -this.trackZ + 10
        );
        this.directionalLight.target.position.set(this.playerX, 0, -this.trackZ);
        this.directionalLight.target.updateMatrixWorld();

        // Check gate collisions
        this.checkGateCollisions();

        // Check obstacle collisions
        this.checkObstacleCollisions();

        // Check enemy collisions
        this.checkEnemyCollisions();

        // Check if reached end (boss)
        if (this.trackZ >= this.trackLength) {
            this.checkBossFight();
        }

        // Update crowd animation
        this.crowdManager.update(delta);

        // Update UI
        this.ui.updateCount(this.crowdManager.getPlayerCount());
    }

    checkGateCollisions() {
        const gates = this.levelGenerator.gates;
        for (let i = gates.length - 1; i >= 0; i--) {
            const gate = gates[i];
            if (gate.passed) continue;

            const gateZ = -gate.z;
            const playerZ = -this.trackZ;

            if (Math.abs(playerZ - gateZ) < 1.0) {
                // Check if player is on left or right gate
                if (this.playerX < 0 && gate.leftGate) {
                    this.applyGate(gate.leftGate);
                    gate.passed = true;
                    this.highlightGate(gate, 'left');
                } else if (this.playerX >= 0 && gate.rightGate) {
                    this.applyGate(gate.rightGate);
                    gate.passed = true;
                    this.highlightGate(gate, 'right');
                }
            }
        }
    }

    applyGate(gateData) {
        const currentCount = this.crowdManager.getPlayerCount();
        let newCount = currentCount;

        switch (gateData.op) {
            case '+': newCount = currentCount + gateData.value; break;
            case '-': newCount = Math.max(1, currentCount - gateData.value); break;
            case '*': newCount = currentCount * gateData.value; break;
            case '/': newCount = Math.max(1, Math.floor(currentCount / gateData.value)); break;
        }

        newCount = Math.min(newCount, 200); // Cap at 200

        if (newCount > currentCount) {
            this.crowdManager.addToPlayerCrowd(newCount - currentCount);
            this.audio.playGateGood();
            this.ui.showFloatingText(`+${newCount - currentCount}`, '#4CAF50');
            this.ui.screenShake(3);
        } else if (newCount < currentCount) {
            this.crowdManager.removeFromPlayerCrowd(currentCount - newCount);
            this.audio.playGateBad();
            this.ui.showFloatingText(`-${currentCount - newCount}`, '#f44336');
            this.ui.screenShake(5);
        }
    }

    highlightGate(gate, side) {
        const mesh = side === 'left' ? gate.leftMesh : gate.rightMesh;
        if (mesh) {
            mesh.material.emissive = new THREE.Color(0xffffff);
            mesh.material.emissiveIntensity = 0.5;
            setTimeout(() => {
                if (mesh.material) {
                    mesh.material.emissiveIntensity = 0;
                }
            }, 300);
        }
    }

    checkObstacleCollisions() {
        const obstacles = this.levelGenerator.obstacles;
        for (const obs of obstacles) {
            if (obs.passed) continue;
            const obsZ = -obs.z;
            const playerZ = -this.trackZ;

            if (Math.abs(playerZ - obsZ) < 1.5) {
                // Check X overlap
                const playerLeft = this.playerX - 1.5;
                const playerRight = this.playerX + 1.5;
                const obsLeft = obs.x - obs.width / 2;
                const obsRight = obs.x + obs.width / 2;

                if (playerRight > obsLeft && playerLeft < obsRight) {
                    // Hit obstacle
                    const loss = Math.ceil(this.crowdManager.getPlayerCount() * 0.3);
                    this.crowdManager.removeFromPlayerCrowd(loss);
                    obs.passed = true;
                    this.audio.playHit();
                    this.ui.screenShake(8);
                    this.ui.showFloatingText(`-${loss}`, '#ff5722');

                    if (this.crowdManager.getPlayerCount() <= 0) {
                        this.loseGame();
                    }
                }
            }
        }
    }

    checkEnemyCollisions() {
        const enemies = this.levelGenerator.enemies;
        for (const enemy of enemies) {
            if (enemy.defeated) continue;
            const enemyZ = -enemy.z;
            const playerZ = -this.trackZ;

            if (Math.abs(playerZ - enemyZ) < 2.0) {
                // Start fight - switch to fighting state
                this.state = 'fighting';
                this.fightingEnemy = enemy;
                this.fightingEnemy.remainingCount = enemy.count;
                this.fightTimer = 0;
                this.fightCameraTime = 0;
                this.speed = 0;
                this.audio.playHit();
                this.ui.screenShake(10);
                // Big collision flash
                this.crowdManager.spawnImpactFlash(
                    new THREE.Vector3(this.playerX, 1, -this.trackZ), 0xFFFFFF
                );
                this.crowdManager.spawnSparks(
                    new THREE.Vector3(this.playerX, 1, -this.trackZ), 0xFFAA00, 10
                );
                return;
            }
        }
    }

    updateFight(delta) {
        this.fightTimer += delta;

        if (this.fightTimer >= this.fightInterval) {
            this.fightTimer -= this.fightInterval;

            const playerCount = this.crowdManager.getPlayerCount();
            const enemy = this.fightingEnemy;

            if (!enemy) return;

            // Remove one from each side per tick
            const strength = this.strengthUpgrade;

            // Player kills enemy stickmen (strength determines how many enemy die per tick)
            const enemyKills = Math.min(strength, enemy.remainingCount);
            enemy.remainingCount -= enemyKills;

            // Enemy kills one player stickman per tick
            if (enemy.remainingCount > 0) {
                this.crowdManager.removeFromPlayerCrowd(1);
                // Fly-off effect for the removed stickman
                this.crowdManager.spawnDeathEffect(this.playerX, -this.trackZ, 0x2196F3);
            }

            // Spawn red death effect for enemy dying
            if (enemyKills > 0) {
                const enemyX = (Math.random() - 0.5) * 3;
                this.crowdManager.spawnDeathEffect(enemyX, -enemy.z, 0xf44336);
                this.audio.playFightHit();
            }

            // Update enemy visual count or boss health bar
            if (enemy.isBoss) {
                this.ui.updateBossHealthBar(enemy.remainingCount, enemy.count);
                this.levelGenerator.shakeBoss();
            } else {
                this.levelGenerator.updateEnemyLabel(enemy);
            }

            // Check fight outcome
            if (enemy.remainingCount <= 0) {
                // Player wins
                enemy.defeated = true;
                if (enemy.isBoss) {
                    // Boss defeat animation
                    this.ui.hideBossHealthBar();
                    this.levelGenerator.playBossDefeatAnimation();
                    this.ui.screenShake(15);
                    this.crowdManager.spawnSparks(
                        new THREE.Vector3(0, 3, -enemy.z), 0x9C27B0, 20
                    );
                    // Delay win screen for dramatic effect
                    setTimeout(() => this.winGame(), 1200);
                    this.state = 'boss_defeated';
                    this.fightingEnemy = null;
                    this.fightCameraTime = 0;
                } else {
                    this.crowdManager.removeEnemyCrowd(enemy);
                    this.state = 'playing';
                    this.speed = 9;
                    this.fightingEnemy = null;
                    this.fightCameraTime = 0;
                    this.camera.position.y = 12;
                }
            } else if (this.crowdManager.getPlayerCount() <= 0) {
                // Player loses
                this.ui.hideBossHealthBar();
                this.loseGame();
                this.fightingEnemy = null;
                this.fightCameraTime = 0;
            }
        }

        // Update death particles
        this.crowdManager.updateParticles(delta);
    }

    checkBossFight() {
        const boss = this.levelGenerator.boss;
        if (!boss || boss.defeated) {
            this.winGame();
            return;
        }

        // Start boss fight in fighting mode
        this.state = 'fighting';
        this.audio.playBossAppear();
        this.ui.screenShake(12);
        this.fightCameraTime = 0;
        this.fightingEnemy = {
            z: boss.z,
            count: boss.health,
            remainingCount: boss.health,
            defeated: false,
            isBoss: true,
            meshGroup: null
        };
        this.fightTimer = 0;
        this.speed = 0;

        // Show boss health bar
        this.ui.showBossHealthBar(boss.health);

        // Override updateFight end condition for boss
        const originalCheck = this.fightingEnemy;
        Object.defineProperty(originalCheck, 'defeated', {
            get: () => boss.defeated,
            set: (v) => { boss.defeated = v; }
        });
    }

    winGame() {
        this.state = 'win';
        const earnedCoins = Math.floor(this.crowdManager.getPlayerCount() * 2 + this.level * 10);
        this.coins += earnedCoins;
        this.level++;
        this.saveProgress();
        this.audio.stopMusic();
        this.audio.playWin();
        this.ui.showWin(earnedCoins);
    }

    loseGame() {
        this.state = 'lose';
        const earnedCoins = Math.floor(this.level * 2);
        this.coins += earnedCoins;
        this.saveProgress();
        this.audio.stopMusic();
        this.audio.playLose();
        this.ui.showLose();
    }

    upgradecrowd() {
        const cost = this.crowdUpgrade * 50;
        if (this.coins >= cost) {
            this.coins -= cost;
            this.crowdUpgrade++;
            this.saveProgress();
            return true;
        }
        return false;
    }

    upgradeStrength() {
        const cost = this.strengthUpgrade * 75;
        if (this.coins >= cost) {
            this.coins -= cost;
            this.strengthUpgrade++;
            this.saveProgress();
            return true;
        }
        return false;
    }

    buySkin(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        if (!skin || skin.owned) return false;
        if (skin.shareUnlock) return false;
        if (this.coins < skin.price) return false;
        this.coins -= skin.price;
        skin.owned = true;
        this.equippedSkin = skinId;
        this.saveProgress();
        return true;
    }

    equipSkin(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        if (!skin || !skin.owned) return false;
        this.equippedSkin = skinId;
        this.saveProgress();
        return true;
    }

    shareForSkin(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        if (!skin || !skin.shareUnlock || skin.owned) return false;
        skin.owned = true;
        this.equippedSkin = skinId;
        this.saveProgress();
        return true;
    }

    buyTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme || theme.owned) return false;
        if (this.coins < theme.price) return false;
        this.coins -= theme.price;
        theme.owned = true;
        this.equippedTheme = themeId;
        this.applyTheme();
        this.saveProgress();
        return true;
    }

    equipTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme || !theme.owned) return false;
        this.equippedTheme = themeId;
        this.applyTheme();
        this.saveProgress();
        return true;
    }

    getPlayerColor() {
        const skin = this.skins.find(s => s.id === this.equippedSkin);
        return skin ? skin.color : 0x2196F3;
    }

    getActiveTheme() {
        return this.themes.find(t => t.id === this.equippedTheme) || this.themes[0];
    }

    applyTheme() {
        const theme = this.getActiveTheme();
        // Update sky
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = 1;
        skyCanvas.height = 512;
        const skyCtx = skyCanvas.getContext('2d');
        const gradient = skyCtx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, theme.colors[0]);
        gradient.addColorStop(0.2, theme.colors[1]);
        gradient.addColorStop(0.5, theme.colors[2]);
        gradient.addColorStop(0.8, theme.colors[3]);
        gradient.addColorStop(1.0, theme.colors[4]);
        skyCtx.fillStyle = gradient;
        skyCtx.fillRect(0, 0, 1, 512);
        const skyTexture = new THREE.CanvasTexture(skyCanvas);
        this.scene.background = skyTexture;
        this.scene.fog = new THREE.FogExp2(theme.fog, 0.006);
    }

    saveProgress() {
        const data = {
            level: this.level,
            coins: this.coins,
            crowdUpgrade: this.crowdUpgrade,
            strengthUpgrade: this.strengthUpgrade,
            ownedSkins: this.skins.filter(s => s.owned).map(s => s.id),
            equippedSkin: this.equippedSkin,
            ownedThemes: this.themes.filter(t => t.owned).map(t => t.id),
            equippedTheme: this.equippedTheme
        };
        localStorage.setItem('countMasters', JSON.stringify(data));
    }

    loadProgress() {
        const data = localStorage.getItem('countMasters');
        if (data) {
            const parsed = JSON.parse(data);
            this.level = parsed.level || 1;
            this.coins = parsed.coins || 0;
            this.crowdUpgrade = parsed.crowdUpgrade || 1;
            this.strengthUpgrade = parsed.strengthUpgrade || 1;
            if (parsed.ownedSkins) {
                this.skins.forEach(s => { s.owned = parsed.ownedSkins.includes(s.id); });
            }
            if (parsed.equippedSkin) this.equippedSkin = parsed.equippedSkin;
            if (parsed.ownedThemes) {
                this.themes.forEach(t => { t.owned = parsed.ownedThemes.includes(t.id); });
            }
            if (parsed.equippedTheme) this.equippedTheme = parsed.equippedTheme;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(this.clock.getDelta(), 0.05);
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    }
}
