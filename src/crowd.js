import * as THREE from 'three';

export class CrowdManager {
    constructor(scene) {
        this.scene = scene;
        this.playerStickmen = [];
        this.playerGroup = null;
        this.playerCount = 0;
        this.animTime = 0;
        this.deathParticles = [];
    }

    clear() {
        if (this.playerGroup) {
            this.scene.remove(this.playerGroup);
            this.playerGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        this.playerStickmen = [];
        this.playerGroup = null;
        this.playerCount = 0;
    }

    createPlayerCrowd(count) {
        this.clear();
        this.playerCount = count;
        this.playerGroup = new THREE.Group();
        this.playerGroup.userData.dynamic = true;

        for (let i = 0; i < count; i++) {
            this.addStickmanToGroup(i);
        }

        this.scene.add(this.playerGroup);
    }

    addStickmanToGroup(index) {
        const stickman = this.createStickman(0x2196F3);
        const pos = this.getFormationPosition(index);
        stickman.position.set(pos.x, 0, pos.z);
        stickman.userData.index = index;
        this.playerGroup.add(stickman);
        this.playerStickmen.push(stickman);
    }

    getFormationPosition(index) {
        if (index === 0) return { x: 0, z: 0 };
        // Spiral formation
        const angle = index * 2.4; // Golden angle approx
        const radius = Math.sqrt(index) * 0.4;
        return {
            x: Math.cos(angle) * radius,
            z: Math.sin(angle) * radius * 0.6
        };
    }

    createStickman(color) {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color });

        // Body
        const bodyGeo = new THREE.CapsuleGeometry(0.15, 0.5, 4, 4);
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 0.7;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 1.2;
        head.castShadow = true;
        group.add(head);

        // Legs
        const legGeo = new THREE.CapsuleGeometry(0.07, 0.3, 4, 4);
        const leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.1, 0.2, 0);
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.1, 0.2, 0);
        group.add(rightLeg);

        // Arms
        const armGeo = new THREE.CapsuleGeometry(0.05, 0.25, 4, 4);
        const leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.25, 0.75, 0);
        leftArm.rotation.z = 0.3;
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, mat);
        rightArm.position.set(0.25, 0.75, 0);
        rightArm.rotation.z = -0.3;
        group.add(rightArm);

        return group;
    }

    addToPlayerCrowd(amount) {
        const startIndex = this.playerCount;
        this.playerCount += amount;

        for (let i = 0; i < amount; i++) {
            this.addStickmanToGroup(startIndex + i);
        }
    }

    removeFromPlayerCrowd(amount) {
        amount = Math.min(amount, this.playerCount - 1);
        if (amount <= 0) return;

        for (let i = 0; i < amount; i++) {
            if (this.playerStickmen.length > 1) {
                const stickman = this.playerStickmen.pop();
                this.playerGroup.remove(stickman);
                stickman.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
        }
        this.playerCount = Math.max(1, this.playerCount - amount);
    }

    removeEnemyCrowd(enemy) {
        if (enemy.meshGroup) {
            this.scene.remove(enemy.meshGroup);
            enemy.meshGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }

    getPlayerCount() {
        return this.playerCount;
    }

    updatePlayerPosition(x, z) {
        if (this.playerGroup) {
            this.playerGroup.position.set(x, 0, z);
        }
    }

    update(delta) {
        this.animTime += delta * 8;
        
        // Animate stickmen running
        if (this.playerStickmen.length > 0) {
            this.playerStickmen.forEach((stickman, i) => {
                const offset = i * 0.5;
                // Bobbing motion
                stickman.position.y = Math.abs(Math.sin(this.animTime + offset)) * 0.15;
                
                // Leg animation
                const children = stickman.children;
                if (children.length >= 4) {
                    children[2].rotation.x = Math.sin(this.animTime + offset) * 0.4; // left leg
                    children[3].rotation.x = -Math.sin(this.animTime + offset) * 0.4; // right leg
                }
                if (children.length >= 6) {
                    children[4].rotation.x = -Math.sin(this.animTime + offset) * 0.3; // left arm
                    children[5].rotation.x = Math.sin(this.animTime + offset) * 0.3; // right arm
                }
            });
        }

        // Update particles
        this.updateParticles(delta);
    }

    spawnDeathEffect(x, z, color) {
        // Create a small stickman that flies up and fades
        const geo = new THREE.SphereGeometry(0.2, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
        const particle = new THREE.Mesh(geo, mat);
        
        particle.position.set(
            x + (Math.random() - 0.5) * 2,
            0.5,
            z + (Math.random() - 0.5) * 1
        );

        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            5 + Math.random() * 4,
            (Math.random() - 0.5) * 5
        );
        particle.userData.life = 1.0;
        particle.userData.dynamic = true;

        this.scene.add(particle);
        this.deathParticles.push(particle);
    }

    updateParticles(delta) {
        for (let i = this.deathParticles.length - 1; i >= 0; i--) {
            const p = this.deathParticles[i];
            p.userData.life -= delta * 2;
            
            // Apply gravity and velocity
            p.userData.velocity.y -= 15 * delta;
            p.position.x += p.userData.velocity.x * delta;
            p.position.y += p.userData.velocity.y * delta;
            p.position.z += p.userData.velocity.z * delta;
            
            // Fade out
            p.material.opacity = Math.max(0, p.userData.life);
            
            // Scale down
            const s = Math.max(0.1, p.userData.life);
            p.scale.set(s, s, s);

            if (p.userData.life <= 0 || p.position.y < -2) {
                this.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                this.deathParticles.splice(i, 1);
            }
        }
    }
}
