import * as THREE from 'three';

export class LevelGenerator {
    constructor(scene) {
        this.scene = scene;
        this.gates = [];
        this.obstacles = [];
        this.enemies = [];
        this.boss = null;
        this.meshes = [];
    }

    clear() {
        this.gates = [];
        this.obstacles = [];
        this.enemies = [];
        this.boss = null;
        this.meshes.forEach(m => {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
                if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                else m.material.dispose();
            }
        });
        this.meshes = [];
    }

    generate(level, trackLength) {
        this.createTrack(trackLength);
        this.createGates(level, trackLength);
        this.createObstacles(level, trackLength);
        this.createEnemies(level, trackLength);
        this.createBoss(level, trackLength);
        this.createDecorations(trackLength);
    }

    createTrack(trackLength) {
        // Main track with gradient-like segments
        const trackGeo = new THREE.PlaneGeometry(10, trackLength);
        const trackMat = new THREE.MeshStandardMaterial({ 
            color: 0x37474F,
            roughness: 0.6,
            metalness: 0.1
        });
        const track = new THREE.Mesh(trackGeo, trackMat);
        track.rotation.x = -Math.PI / 2;
        track.position.set(0, 0.01, -trackLength / 2);
        track.receiveShadow = true;
        track.userData.dynamic = true;
        this.scene.add(track);
        this.meshes.push(track);

        // Track lane divider (dashed center line)
        for (let z = 0; z < trackLength; z += 4) {
            const dashGeo = new THREE.PlaneGeometry(0.15, 1.5);
            const dashMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, opacity: 0.5, transparent: true });
            const dash = new THREE.Mesh(dashGeo, dashMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.02, -z);
            dash.userData.dynamic = true;
            this.scene.add(dash);
            this.meshes.push(dash);
        }

        // Track borders - glowing blue
        const borderGeo = new THREE.BoxGeometry(0.3, 0.6, trackLength);
        const borderMat = new THREE.MeshStandardMaterial({ 
            color: 0x2196F3, 
            emissive: 0x1565C0,
            emissiveIntensity: 0.3
        });
        
        const leftBorder = new THREE.Mesh(borderGeo, borderMat);
        leftBorder.position.set(-5, 0.3, -trackLength / 2);
        leftBorder.castShadow = true;
        leftBorder.userData.dynamic = true;
        this.scene.add(leftBorder);
        this.meshes.push(leftBorder);

        const rightBorder = new THREE.Mesh(borderGeo, borderMat.clone());
        rightBorder.position.set(5, 0.3, -trackLength / 2);
        rightBorder.castShadow = true;
        rightBorder.userData.dynamic = true;
        this.scene.add(rightBorder);
        this.meshes.push(rightBorder);

        // Ground plane - lush green with variation
        const groundGeo = new THREE.PlaneGeometry(200, trackLength + 100);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x66BB6A, 
            roughness: 1.0 
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.05, -trackLength / 2);
        ground.receiveShadow = true;
        ground.userData.dynamic = true;
        this.scene.add(ground);
        this.meshes.push(ground);

        // Grass patches near track edges
        for (let z = 0; z < trackLength; z += 3) {
            for (let side = -1; side <= 1; side += 2) {
                if (Math.random() > 0.5) continue;
                const x = side * (5.2 + Math.random() * 0.5);
                const grassGeo = new THREE.PlaneGeometry(0.3, 0.6);
                const grassMat = new THREE.MeshStandardMaterial({ 
                    color: 0x33691E, 
                    side: THREE.DoubleSide 
                });
                const grass = new THREE.Mesh(grassGeo, grassMat);
                grass.position.set(x, 0.3, -z);
                grass.rotation.x = -0.2;
                grass.rotation.y = Math.random() * Math.PI;
                grass.userData.dynamic = true;
                this.scene.add(grass);
                this.meshes.push(grass);
            }
        }
    }

    createGates(level, trackLength) {
        const gateCount = 8 + level * 2;
        const spacing = (trackLength - 30) / gateCount;

        for (let i = 0; i < gateCount; i++) {
            const z = 20 + i * spacing;
            const gateData = this.generateGatePair(level);
            
            const gate = {
                z: z,
                passed: false,
                leftGate: gateData.left,
                rightGate: gateData.right,
                leftMesh: null,
                rightMesh: null
            };

            // Create gate meshes
            gate.leftMesh = this.createGateMesh(gateData.left, -2.5, z);
            gate.rightMesh = this.createGateMesh(gateData.right, 2.5, z);

            // Divider
            const divGeo = new THREE.BoxGeometry(0.2, 4, 0.3);
            const divMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const divider = new THREE.Mesh(divGeo, divMat);
            divider.position.set(0, 2, -z);
            divider.userData.dynamic = true;
            this.scene.add(divider);
            this.meshes.push(divider);

            this.gates.push(gate);
        }
    }

    generateGatePair(level) {
        const ops = ['+', '*', '-'];
        const leftOp = ops[Math.floor(Math.random() * 2)]; // Prefer + and *
        let rightOp = ops[Math.floor(Math.random() * 3)];
        
        // Ensure variety
        if (rightOp === leftOp) rightOp = ops[(ops.indexOf(rightOp) + 1) % ops.length];

        const getValue = (op) => {
            switch (op) {
                case '+': return Math.floor(Math.random() * (5 + level * 2)) + 3;
                case '*': return Math.floor(Math.random() * 2) + 2;
                case '-': return Math.floor(Math.random() * (3 + level)) + 2;
                default: return 2;
            }
        };

        return {
            left: { op: leftOp, value: getValue(leftOp) },
            right: { op: rightOp, value: getValue(rightOp) }
        };
    }

    createGateMesh(gateData, x, z) {
        const isGood = gateData.op === '+' || gateData.op === '*';
        const color = isGood ? 0x4CAF50 : 0xf44336;
        
        const gateGeo = new THREE.BoxGeometry(4.5, 4, 0.3);
        const gateMat = new THREE.MeshStandardMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const gateMesh = new THREE.Mesh(gateGeo, gateMat);
        gateMesh.position.set(x, 2, -z);
        gateMesh.userData.dynamic = true;
        this.scene.add(gateMesh);
        this.meshes.push(gateMesh);

        // Text label
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${gateData.op}${gateData.value}`, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(3, 1.5);
        const labelMat = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            depthWrite: false
        });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(x, 2.5, -z + 0.2);
        label.userData.dynamic = true;
        this.scene.add(label);
        this.meshes.push(label);

        return gateMesh;
    }

    createObstacles(level, trackLength) {
        const count = 3 + level;
        const safeZones = this.gates.map(g => g.z);

        for (let i = 0; i < count; i++) {
            let z;
            let attempts = 0;
            do {
                z = 30 + Math.random() * (trackLength - 60);
                attempts++;
            } while (safeZones.some(gz => Math.abs(gz - z) < 8) && attempts < 50);

            if (attempts >= 50) continue;

            const obstacleType = Math.random();
            let x, width;

            if (obstacleType < 0.5) {
                // Spinning saw
                x = (Math.random() - 0.5) * 5;
                width = 3;
                this.createSawObstacle(x, z);
            } else {
                // Wall barrier
                x = (Math.random() - 0.5) * 4;
                width = 2 + Math.random() * 3;
                this.createWallObstacle(x, z, width);
            }

            this.obstacles.push({ x, z, width, passed: false });
        }
    }

    createSawObstacle(x, z) {
        const sawGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16);
        const sawMat = new THREE.MeshStandardMaterial({ color: 0xff5722, metalness: 0.8, roughness: 0.2 });
        const saw = new THREE.Mesh(sawGeo, sawMat);
        saw.position.set(x, 1, -z);
        saw.rotation.x = Math.PI / 2;
        saw.userData.dynamic = true;
        this.scene.add(saw);
        this.meshes.push(saw);

        // Saw teeth visual
        const teethGeo = new THREE.TorusGeometry(1.5, 0.15, 4, 12);
        const teeth = new THREE.Mesh(teethGeo, sawMat.clone());
        teeth.position.set(x, 1, -z);
        teeth.rotation.x = Math.PI / 2;
        teeth.userData.dynamic = true;
        this.scene.add(teeth);
        this.meshes.push(teeth);
    }

    createWallObstacle(x, z, width) {
        const wallGeo = new THREE.BoxGeometry(width, 2.5, 0.5);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x795548 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(x, 1.25, -z);
        wall.castShadow = true;
        wall.userData.dynamic = true;
        this.scene.add(wall);
        this.meshes.push(wall);

        // Spikes on top
        for (let i = 0; i < Math.floor(width); i++) {
            const spikeGeo = new THREE.ConeGeometry(0.15, 0.6, 4);
            const spikeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(x - width/2 + 0.5 + i * 0.8, 2.8, -z);
            spike.userData.dynamic = true;
            this.scene.add(spike);
            this.meshes.push(spike);
        }
    }

    createEnemies(level, trackLength) {
        const count = 2 + Math.floor(level * 0.5);
        const spacing = (trackLength - 60) / (count + 1);

        for (let i = 0; i < count; i++) {
            const z = 50 + (i + 1) * spacing;
            const enemyCount = Math.floor(5 + level * 3 + Math.random() * level * 5);
            
            const enemy = {
                z: z,
                count: enemyCount,
                defeated: false,
                meshes: []
            };

            // Create enemy crowd visual
            this.createEnemyCrowd(enemy, z, enemyCount);
            this.enemies.push(enemy);
        }
    }

    createEnemyCrowd(enemy, z, count) {
        const displayCount = Math.min(count, 30);
        const group = new THREE.Group();
        group.userData.dynamic = true;

        for (let i = 0; i < displayCount; i++) {
            const angle = (i / displayCount) * Math.PI * 2 + Math.random() * 0.5;
            const radius = Math.sqrt(i / displayCount) * 2.5;
            const stickman = this.createStickman(0xf44336);
            stickman.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius * 0.5
            );
            group.add(stickman);
        }

        group.position.set(0, 0, -z);
        this.scene.add(group);
        this.meshes.push(group);
        enemy.meshGroup = group;

        // Count label
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count.toString(), 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(2, 1);
        const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(0, 4, -z);
        label.userData.dynamic = true;
        this.scene.add(label);
        this.meshes.push(label);
        enemy.labelMesh = label;
    }

    updateEnemyLabel(enemy) {
        if (!enemy.labelMesh) return;
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.max(0, enemy.remainingCount).toString(), 64, 32);
        
        if (enemy.labelMesh.material.map) {
            enemy.labelMesh.material.map.dispose();
        }
        enemy.labelMesh.material.map = new THREE.CanvasTexture(canvas);
        enemy.labelMesh.material.needsUpdate = true;

        // Also remove stickmen from the enemy group visually
        if (enemy.meshGroup && enemy.meshGroup.children.length > 0) {
            const child = enemy.meshGroup.children[enemy.meshGroup.children.length - 1];
            enemy.meshGroup.remove(child);
        }
    }

    createBoss(level, trackLength) {
        const bossHealth = Math.floor(20 + level * 15);
        this.boss = { z: trackLength, health: bossHealth, defeated: false };

        // Giant king stickman
        const bossGroup = new THREE.Group();
        bossGroup.userData.dynamic = true;

        // Body
        const bodyGeo = new THREE.CapsuleGeometry(1, 3, 8, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9C27B0 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 3;
        bossGroup.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 6;
        bossGroup.add(head);

        // Crown
        const crownGeo = new THREE.CylinderGeometry(0.8, 1.2, 0.8, 5);
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 });
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.y = 7.2;
        bossGroup.add(crown);

        // Arms
        const armGeo = new THREE.CapsuleGeometry(0.3, 2, 4, 4);
        const leftArm = new THREE.Mesh(armGeo, bodyMat);
        leftArm.position.set(-1.5, 3.5, 0);
        leftArm.rotation.z = 0.3;
        bossGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, bodyMat.clone());
        rightArm.position.set(1.5, 3.5, 0);
        rightArm.rotation.z = -0.3;
        bossGroup.add(rightArm);

        bossGroup.position.set(0, 0, -trackLength);
        this.scene.add(bossGroup);
        this.meshes.push(bossGroup);

        // Boss health label
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#9C27B0';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`👑 BOSS: ${bossHealth}`, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(5, 1.2);
        const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(0, 9, -trackLength);
        label.userData.dynamic = true;
        this.scene.add(label);
        this.meshes.push(label);
    }

    createDecorations(trackLength) {
        // Trees along both sides
        for (let z = 0; z < trackLength; z += 8) {
            // Left side trees
            if (Math.random() > 0.3) {
                const x = -(7 + Math.random() * 8);
                this.createTree(x, -z + Math.random() * 4);
            }
            // Right side trees
            if (Math.random() > 0.3) {
                const x = 7 + Math.random() * 8;
                this.createTree(x, -z + Math.random() * 4);
            }
        }

        // Flowers scattered along the track
        for (let z = 0; z < trackLength; z += 5) {
            for (let i = 0; i < 3; i++) {
                const side = Math.random() > 0.5 ? 1 : -1;
                const x = side * (5.5 + Math.random() * 3);
                this.createFlower(x, -z + Math.random() * 4);
            }
        }

        // Rocks
        for (let z = 0; z < trackLength; z += 20) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (8 + Math.random() * 6);
            this.createRock(x, -z);
        }

        // Mountains in the far background
        this.createMountains(trackLength);

        // Clouds
        this.createClouds(trackLength);

        // Bushes near the track
        for (let z = 0; z < trackLength; z += 12) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (5.5 + Math.random() * 2);
            this.createBush(x, -z);
        }
    }

    createTree(x, z) {
        const treeType = Math.random();
        
        if (treeType < 0.4) {
            // Pine tree
            const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2.5, 6);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x, 1.25, z);
            trunk.castShadow = true;
            trunk.userData.dynamic = true;
            this.scene.add(trunk);
            this.meshes.push(trunk);

            // Layered cone foliage
            const colors = [0x1B5E20, 0x2E7D32, 0x388E3C];
            for (let i = 0; i < 3; i++) {
                const coneGeo = new THREE.ConeGeometry(1.2 - i * 0.25, 1.8 - i * 0.3, 8);
                const coneMat = new THREE.MeshStandardMaterial({ color: colors[i] });
                const cone = new THREE.Mesh(coneGeo, coneMat);
                cone.position.set(x, 2.5 + i * 1.0, z);
                cone.castShadow = true;
                cone.userData.dynamic = true;
                this.scene.add(cone);
                this.meshes.push(cone);
            }
        } else if (treeType < 0.7) {
            // Round leafy tree
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.5, 6);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6D4C41 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x, 1.25, z);
            trunk.castShadow = true;
            trunk.userData.dynamic = true;
            this.scene.add(trunk);
            this.meshes.push(trunk);

            const leafGeo = new THREE.SphereGeometry(1.5 + Math.random() * 0.5, 8, 8);
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x43A047 });
            const leaves = new THREE.Mesh(leafGeo, leafMat);
            leaves.position.set(x, 3.2, z);
            leaves.castShadow = true;
            leaves.userData.dynamic = true;
            this.scene.add(leaves);
            this.meshes.push(leaves);
        } else {
            // Cherry blossom tree
            const trunkGeo = new THREE.CylinderGeometry(0.15, 0.3, 2, 6);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4E342E });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x, 1, z);
            trunk.castShadow = true;
            trunk.userData.dynamic = true;
            this.scene.add(trunk);
            this.meshes.push(trunk);

            const leafGeo = new THREE.SphereGeometry(1.3, 8, 8);
            const leafMat = new THREE.MeshStandardMaterial({ color: 0xF48FB1 });
            const leaves = new THREE.Mesh(leafGeo, leafMat);
            leaves.position.set(x, 2.8, z);
            leaves.castShadow = true;
            leaves.userData.dynamic = true;
            this.scene.add(leaves);
            this.meshes.push(leaves);
        }
    }

    createFlower(x, z) {
        const colors = [0xFF5252, 0xFFD740, 0xE040FB, 0x40C4FF, 0xFF6E40, 0x69F0AE];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(x, 0.2, z);
        stem.userData.dynamic = true;
        this.scene.add(stem);
        this.meshes.push(stem);

        // Flower head
        const flowerGeo = new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 6, 6);
        const flowerMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
        const flower = new THREE.Mesh(flowerGeo, flowerMat);
        flower.position.set(x, 0.45, z);
        flower.userData.dynamic = true;
        this.scene.add(flower);
        this.meshes.push(flower);
    }

    createRock(x, z) {
        const scale = 0.5 + Math.random() * 1.0;
        const rockGeo = new THREE.DodecahedronGeometry(scale, 0);
        const rockMat = new THREE.MeshStandardMaterial({ 
            color: 0x757575, 
            roughness: 0.9,
            flatShading: true 
        });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(x, scale * 0.4, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.userData.dynamic = true;
        this.scene.add(rock);
        this.meshes.push(rock);
    }

    createBush(x, z) {
        const group = new THREE.Group();
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x558B2F });
        
        for (let i = 0; i < 3; i++) {
            const size = 0.4 + Math.random() * 0.3;
            const bushGeo = new THREE.SphereGeometry(size, 6, 6);
            const bush = new THREE.Mesh(bushGeo, bushMat);
            bush.position.set(
                (Math.random() - 0.5) * 0.6,
                size * 0.7,
                (Math.random() - 0.5) * 0.6
            );
            group.add(bush);
        }
        
        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createMountains(trackLength) {
        const mountainColors = [0x5C6BC0, 0x7986CB, 0x3949AB];
        
        for (let i = 0; i < 12; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            const x = side * (40 + Math.random() * 30);
            const z = -(Math.random() * trackLength);
            const height = 15 + Math.random() * 20;
            const radius = 8 + Math.random() * 10;
            
            const mountainGeo = new THREE.ConeGeometry(radius, height, 6);
            const mountainMat = new THREE.MeshStandardMaterial({ 
                color: mountainColors[Math.floor(Math.random() * mountainColors.length)],
                flatShading: true
            });
            const mountain = new THREE.Mesh(mountainGeo, mountainMat);
            mountain.position.set(x, height * 0.3, z);
            mountain.userData.dynamic = true;
            this.scene.add(mountain);
            this.meshes.push(mountain);

            // Snow cap
            if (height > 20) {
                const snowGeo = new THREE.ConeGeometry(radius * 0.3, height * 0.2, 6);
                const snowMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
                const snow = new THREE.Mesh(snowGeo, snowMat);
                snow.position.set(x, height * 0.7, z);
                snow.userData.dynamic = true;
                this.scene.add(snow);
                this.meshes.push(snow);
            }
        }
    }

    createClouds(trackLength) {
        for (let i = 0; i < 20; i++) {
            const group = new THREE.Group();
            const cloudMat = new THREE.MeshStandardMaterial({ 
                color: 0xFFFFFF, 
                transparent: true, 
                opacity: 0.85 
            });

            const numPuffs = 3 + Math.floor(Math.random() * 4);
            for (let j = 0; j < numPuffs; j++) {
                const puffGeo = new THREE.SphereGeometry(1.5 + Math.random() * 2, 8, 8);
                const puff = new THREE.Mesh(puffGeo, cloudMat);
                puff.position.set(
                    j * 2.2 + Math.random() * 0.5,
                    Math.random() * 0.8,
                    Math.random() * 1.0
                );
                puff.scale.y = 0.6;
                group.add(puff);
            }

            group.position.set(
                (Math.random() - 0.5) * 80,
                20 + Math.random() * 15,
                -(Math.random() * trackLength)
            );
            group.userData.dynamic = true;
            this.scene.add(group);
            this.meshes.push(group);
        }
    }

    createStickman(color) {
        const group = new THREE.Group();
        
        // Body
        const bodyGeo = new THREE.CapsuleGeometry(0.15, 0.5, 4, 4);
        const mat = new THREE.MeshStandardMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 0.7;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 1.2;
        group.add(head);

        // Legs
        const legGeo = new THREE.CapsuleGeometry(0.07, 0.3, 4, 4);
        const leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.1, 0.2, 0);
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.1, 0.2, 0);
        group.add(rightLeg);

        return group;
    }
}
