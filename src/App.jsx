import React, { useState, useEffect, useRef, useCallback } from 'react';

// Weapon types
const WEAPON_TYPES = [
    { name: '火焰剑', emoji: '🔥', color: '#ff4500', damage: 15, special: 'burn', durability: 5 },
    { name: '闪电锤', emoji: '⚡', color: '#ffd700', damage: 20, special: 'knockback', durability: 4 },
    { name: '冰霜弓', emoji: '🧊', color: '#00bfff', damage: 12, special: 'slow', durability: 6 },
    { name: '钻石匕首', emoji: '💎', color: '#00ffff', damage: 25, special: 'crit', durability: 3 },
    { name: '战斧', emoji: '🪓', color: '#8b4513', damage: 22, special: 'stun', durability: 4 },
    { name: '回旋镖', emoji: '🎯', color: '#ff1493', damage: 18, special: 'boomerang', durability: 5 }
];

// 伤害飘字类
class DamageText {
    constructor(x, y, damage, isCrit = false) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.isCrit = isCrit;
        this.vy = -2;
        this.life = 60;
        this.alpha = 1;
    }

    update() {
        this.y += this.vy;
        this.life--;
        this.alpha = this.life / 60;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = `${this.isCrit ? 'bold ' : ''}20px Arial`;
        ctx.textAlign = 'center';

        if (this.isCrit) {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffff00';
            ctx.fillText(`💥 ${this.damage}`, this.x, this.y);
        } else {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillText(this.damage, this.x, this.y);
        }

        ctx.restore();
    }
}

// 特效粒子类（用于武器拾取、使用特效）
class Particle {
    constructor(x, y, color, type = 'normal') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 30;
        this.alpha = 1;
        this.size = type === 'special' ? 6 : 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.alpha = this.life / 30;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 武器拾取动画类
class FlyingWeapon {
    constructor(weapon, targetX, targetY) {
        this.weapon = weapon;
        this.x = weapon.x;
        this.y = weapon.y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = 8;
        this.life = 30;
        this.reached = false;
    }

    update() {
        if (this.reached) return false;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
            this.reached = true;
            return false;
        }

        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.weapon.color;
        ctx.fillStyle = this.weapon.color;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.weapon.emoji, this.x, this.y);
        ctx.restore();
    }
}

// 武器挥舞轨迹类
class WeaponTrail {
    constructor(x, y, color, emoji) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.emoji = emoji;
        this.life = 15;
        this.alpha = 1;
        this.rotation = 0;
    }

    update() {
        this.life--;
        this.alpha = this.life / 15;
        this.rotation += 0.3;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha * 0.7;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.emoji, 0, 0);
        ctx.restore();
    }
}

// 冲击波类
class Shockwave {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 5;
        this.maxRadius = 30;
        this.life = 20;
        this.alpha = 1;
    }

    update() {
        this.radius += (this.maxRadius - this.radius) * 0.3;
        this.life--;
        this.alpha = this.life / 20;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// Weapon class
class Weapon {
    constructor(x, y, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -3;
        this.gravity = 0.3;
        this.onGround = false;
        this.lifetime = 300;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.dropAnimation = 0; // 掉落动画

        const type = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
        this.name = type.name;
        this.emoji = type.emoji;
        this.color = type.color;
        this.baseDamage = type.damage;
        this.special = type.special;
        this.durability = type.durability;
        this.maxDurability = type.durability;
    }

    update() {
        if (!this.onGround) {
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;

            const groundLevel = this.canvasHeight - 80;
            if (this.y + this.height >= groundLevel) {
                this.y = groundLevel - this.height;
                this.vy = 0;
                this.vx = 0;
                this.onGround = true;
                this.dropAnimation = 15; // 落地弹跳动画
            }

            if (this.x < 0) this.x = 0;
            if (this.x + this.width > this.canvasWidth) this.x = this.canvasWidth - this.width;
        }

        if (this.dropAnimation > 0) {
            this.dropAnimation--;
        }

        this.lifetime--;
    }

    isExpired() {
        return this.lifetime <= 0;
    }
}

// Stickman player class with enhanced animations
class Stickman {
    constructor(x, y, color, controls, playerNum, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.controls = controls;
        this.playerNum = playerNum;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        this.vx = 0;
        this.vy = 0;
        this.width = 30;
        this.height = 60;
        this.speed = 4;
        this.jumpPower = 12;
        this.gravity = 0.6;

        this.hp = 100;
        this.maxHp = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.staminaRegen = 0.3;

        this.isJumping = false;
        this.isCrouching = false;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackRange = 50;
        this.attackDamage = 10;

        // 新增：特殊攻击类型
        this.attackType = 'punch'; // punch, kick, uppercut, roll
        this.attackFrame = 0;

        this.isBlocking = false;
        this.blockStaminaDrain = 0.5;

        this.combo = 0;
        this.lastHitTime = 0;

        this.weapon = null;
        this.burnDamage = 0;
        this.burnTimer = 0;
        this.slowTimer = 0;
        this.stunTimer = 0;

        this.hitFlashTimer = 0;
        this.hurtAnimation = 0;

        // 翻滚状态
        this.isRolling = false;
        this.rollDirection = 0;
        this.rollFrame = 0;

        this.aiEnabled = false;
        this.aiState = 'idle';
        this.aiTimer = 0;

        this.animationFrame = 0;
    }

    update(keys, opponent) {
        if (this.burnTimer > 0) {
            this.burnTimer--;
            if (this.burnTimer % 30 === 0) {
                this.hp -= this.burnDamage;
            }
        }

        if (this.slowTimer > 0) {
            this.slowTimer--;
        }

        if (this.stunTimer > 0) {
            this.stunTimer--;
            return;
        }

        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer--;
        }

        if (this.hurtAnimation > 0) {
            this.hurtAnimation--;
        }

        // 翻滚更新
        if (this.isRolling) {
            this.rollFrame++;
            this.x += this.rollDirection * 6;
            this.vx = this.rollDirection * 6;

            if (this.rollFrame > 15) {
                this.isRolling = false;
                this.rollFrame = 0;
            }

            // 翻滚时无敌
            if (this.rollFrame < 12) {
                this.hitFlashTimer = 1; // 保持闪烁，表示无敌
            }

            return; // 翻滚中无法做其他动作
        }

        // AI控制
        if (this.aiEnabled && opponent) {
            this.updateAI(opponent);
            return;
        }

        const speed = this.slowTimer > 0 ? this.speed * 0.5 : this.speed;

        this.isCrouching = keys[this.controls.block] && this.isJumping === false;

        // 左右移动
        if (keys[this.controls.left] && !this.isCrouching && !this.isAttacking) {
            this.vx = -speed;
        } else if (keys[this.controls.right] && !this.isCrouching && !this.isAttacking) {
            this.vx = speed;
        } else {
            this.vx *= 0.8;
        }

        // 跳跃
        if (keys[this.controls.jump] && !this.isJumping && !this.isCrouching) {
            this.vy = -this.jumpPower;
            this.isJumping = true;
            this.stamina -= 5;
        }

        // 攻击系统（多类型）
        if (keys[this.controls.attack] && this.attackCooldown <= 0 && this.stamina >= 10) {
            // 随机选择攻击类型
            const rand = Math.random();
            if (rand < 0.3) {
                this.attackType = 'punch';
                this.attack(opponent);
            } else if (rand < 0.6) {
                this.attackType = 'kick';
                this.attack(opponent);
            } else if (rand < 0.8) {
                this.attackType = 'uppercut';
                this.attack(opponent);
            } else {
                // 翻滚攻击
                this.startRoll();
            }
        }

        // 防御/下蹲
        if (this.isCrouching) {
            this.isBlocking = true;
            this.stamina -= this.blockStaminaDrain;
            this.vx = 0;
        } else {
            this.isBlocking = false;
        }

        // 武器使用
        if ((keys['f'] || keys['j']) && this.weapon) {
            this.useWeapon(opponent);
        }

        // 物理更新
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // 地面碰撞
        const groundLevel = this.canvasHeight - 80;
        if (this.y + this.height >= groundLevel) {
            this.y = groundLevel - this.height;
            this.vy = 0;
            this.isJumping = false;
        }

        // 边界限制
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.canvasWidth) this.x = this.canvasWidth - this.width;

        // 体力恢复
        if (this.stamina < this.maxStamina && !this.isAttacking && !this.isBlocking && !this.isRolling) {
            this.stamina += this.staminaRegen;
        }

        // 攻击冷却
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // 攻击帧
        if (this.attackFrame > 0) {
            this.attackFrame--;
        }

        // 连击重置
        if (Date.now() - this.lastHitTime > 2000) {
            this.combo = 0;
        }

        this.animationFrame++;
    }

    startRoll() {
        if (this.isRolling) return;

        this.isRolling = true;
        this.rollFrame = 0;
        // 向对手方向翻滚
        if (this.controls.attack === 'a') {
            this.rollDirection = 1; // 玩家1向右
        } else {
            this.rollDirection = -1; // 玩家2向左
        }
        this.attackCooldown = 20;
        this.stamina -= 15;
    }

    updateAI(opponent) {
        this.aiTimer++;

        const speed = this.slowTimer > 0 ? this.speed * 0.5 : this.speed;
        const distance = Math.abs(this.x - opponent.x);

        if (this.hp < 30) {
            this.aiState = 'defend';
        } else if (distance > 150) {
            this.aiState = 'approach';
        } else if (distance < 80) {
            this.aiState = 'attack';
        } else {
            this.aiState = 'idle';
        }

        switch (this.aiState) {
            case 'approach':
                if (this.x < opponent.x) {
                    this.vx = speed;
                } else {
                    this.vx = -speed;
                }
                if (Math.random() < 0.02 && !this.isJumping) {
                    this.vy = -this.jumpPower;
                    this.isJumping = true;
                }
                break;

            case 'attack':
                if (this.attackCooldown <= 0 && this.stamina >= 10) {
                    if (Math.random() < 0.3) {
                        this.startRoll(); // AI也会翻滚
                    } else {
                        this.attackType = Math.random() < 0.5 ? 'kick' : 'punch';
                        this.attack(opponent);
                    }
                }
                if (distance < 40) {
                    this.vx = this.x < opponent.x ? -speed : speed;
                }
                break;

            case 'defend':
                this.isBlocking = true;
                this.stamina -= this.blockStaminaDrain;
                this.vx = this.x < opponent.x ? -speed : speed;
                break;

            default:
                this.vx *= 0.8;
                if (Math.random() < 0.01) {
                    this.vx = (Math.random() - 0.5) * speed;
                }
        }

        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        const groundLevel = this.canvasHeight - 80;
        if (this.y + this.height >= groundLevel) {
            this.y = groundLevel - this.height;
            this.vy = 0;
            this.isJumping = false;
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.canvasWidth) this.x = this.canvasWidth - this.width;

        if (this.stamina < this.maxStamina && !this.isBlocking && !this.isRolling) {
            this.stamina += this.staminaRegen;
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        if (Date.now() - this.lastHitTime > 2000) {
            this.combo = 0;
        }
    }

    attack(opponent) {
        if (!opponent || this.attackCooldown > 0) return;

        this.isAttacking = true;
        this.attackFrame = 10;
        this.attackCooldown = 30;
        this.stamina -= 10;

        // 根据攻击类型调整范围和伤害
        let range = this.attackRange;
        let baseDamage = this.attackDamage;

        if (this.attackType === 'kick') {
            range += 10;
            baseDamage += 2;
        } else if (this.attackType === 'uppercut') {
            baseDamage += 5;
        }

        const distance = Math.abs(this.x - opponent.x);
        if (distance <= range) {
            let damage = baseDamage;

            if (Math.random() < 0.15) {
                damage = Math.floor(damage * 1.5);
            }

            this.combo++;
            if (this.combo > 1) {
                damage += Math.floor(this.combo * 1.5);
            }

            if (opponent.isBlocking && opponent.stamina > 0) {
                damage = Math.floor(damage * 0.3);
                opponent.stamina -= 5;
            }

            opponent.takeDamage(damage, this, this.combo > 1);
            this.lastHitTime = Date.now();

            // 创建冲击波
            if (window.shockwaves) {
                window.shockwaves.push(
                    new Shockwave(
                        opponent.x + opponent.width / 2,
                        opponent.y + 20,
                        this.color
                    )
                );
            }

            if (this.controls.attack === 'a') {
                this.playSound('punch');
            } else {
                this.playSound('kick');
            }
        }

        setTimeout(() => {
            this.isAttacking = false;
        }, 200);
    }

    useWeapon(opponent) {
        if (!this.weapon || !opponent) return;

        const distance = Math.abs(this.x - opponent.x);
        if (distance <= this.attackRange + 30) {
            let damage = this.weapon.baseDamage;
            let isCrit = false;

            // 创建武器挥舞轨迹
            if (window.weaponTrails) {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        window.weaponTrails.push(
                            new WeaponTrail(
                                this.x + this.width / 2 + (Math.random() - 0.5) * 20,
                                this.y + 20 + (Math.random() - 0.5) * 20,
                                this.weapon.color,
                                this.weapon.emoji
                            )
                        );
                    }, i * 30);
                }
            }

            // 创建冲击波
            if (window.shockwaves) {
                window.shockwaves.push(
                    new Shockwave(
                        opponent.x + opponent.width / 2,
                        opponent.y + 20,
                        this.weapon.color
                    )
                );
            }

            switch (this.weapon.special) {
                case 'burn':
                    opponent.burnDamage = 2;
                    opponent.burnTimer = 150;
                    break;
                case 'knockback':
                    opponent.vx = (opponent.x < this.x ? -1 : 1) * 8;
                    break;
                case 'slow':
                    opponent.slowTimer = 120;
                    break;
                case 'crit':
                    if (Math.random() < 0.3) {
                        damage *= 2;
                        isCrit = true;
                    }
                    break;
                case 'stun':
                    opponent.stunTimer = 30;
                    break;
                case 'boomerang':
                    damage = Math.floor(damage * 1.2);
                    break;
            }

            opponent.takeDamage(damage, this, isCrit);
            this.weapon.durability--;

            if (this.weapon.durability <= 0) {
                this.weapon = null;
            }

            this.playSound('weapon_special');
        }
    }

    takeDamage(damage, attacker, isCrit = false) {
        if (this.isBlocking && this.stamina > 0) {
            damage = Math.floor(damage * 0.3);
            this.stamina -= 10;
        }

        this.hp -= damage;
        this.hitFlashTimer = 10;
        this.hurtAnimation = 15;

        if (attacker) {
            const direction = this.x < attacker.x ? -1 : 1;
            this.vx = direction * 5;
        }

        if (window.damageTexts) {
            const crit = isCrit || damage > 20;
            window.damageTexts.push(
                new DamageText(
                    this.x + this.width / 2,
                    this.y + 10,
                    damage,
                    crit
                )
            );
        }

        this.playSound('hit');
    }

    collectWeapon(weapon, callback) {
        // 创建飞行动画
        if (window.flyingWeapons) {
            window.flyingWeapons.push(
                new FlyingWeapon(weapon, this.x + this.width / 2, this.y + 10)
            );
        }

        // 延迟后真正拾取
        setTimeout(() => {
            this.weapon = weapon;
            if (callback) callback();

            // 创建粒子特效
            if (window.particles) {
                for (let i = 0; i < 10; i++) {
                    window.particles.push(
                        new Particle(
                            this.x + this.width / 2,
                            this.y + 20,
                            weapon.color,
                            'special'
                        )
                    );
                }
            }
        }, 300);

        this.playSound('weapon_pickup');
    }

    playSound(type) {
        if (!window.audioContext) return;

        try {
            const oscillator = window.audioContext.createOscillator();
            const gainNode = window.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(window.audioContext.destination);

            switch(type) {
                case 'punch':
                    oscillator.frequency.value = 150;
                    gainNode.gain.setValueAtTime(0.1, window.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, window.audioContext.currentTime + 0.1);
                    break;
                case 'kick':
                    oscillator.frequency.value = 80;
                    gainNode.gain.setValueAtTime(0.15, window.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, window.audioContext.currentTime + 0.15);
                    break;
                case 'hit':
                    oscillator.frequency.value = 100;
                    gainNode.gain.setValueAtTime(0.12, window.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, window.audioContext.currentTime + 0.1);
                    break;
                case 'weapon_pickup':
                    oscillator.frequency.value = 600;
                    gainNode.gain.setValueAtTime(0.2, window.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, window.audioContext.currentTime + 0.2);
                    break;
                case 'weapon_special':
                    oscillator.frequency.value = 800;
                    gainNode.gain.setValueAtTime(0.18, window.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, window.audioContext.currentTime + 0.3);
                    break;
            }

            oscillator.start(window.audioContext.currentTime);
            oscillator.stop(window.audioContext.currentTime + 0.5);
        } catch(e) {}
    }

    draw(ctx) {
        ctx.save();

        // 闪烁效果
        if (this.hitFlashTimer > 0 && this.hitFlashTimer % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 翻滚特效
        if (this.isRolling) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            // 翻滚轨迹
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + 30, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 状态效果
        if (this.burnTimer > 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff4500';
        }
        if (this.slowTimer > 0) {
            ctx.globalAlpha = 0.7;
        }
        if (this.stunTimer > 0) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y - 10, 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 身体
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // 姿势计算
        let bodyY = this.y;
        let legOffset = 8;
        let armOffset = this.isAttacking ? 10 : 5;
        let armHeight = 22;

        // 下蹲
        if (this.isCrouching) {
            bodyY = this.y + 15;
            legOffset = 4;
        }

        // 受伤
        if (this.hurtAnimation > 0) {
            bodyY += 5;
        }

        // 跳跃
        if (this.isJumping) {
            legOffset = 12;
        }

        // 翻滚
        if (this.isRolling) {
            bodyY = this.y + 20;
            legOffset = 0;
        }

        // 攻击类型特定姿势
        if (this.isAttacking) {
            if (this.attackType === 'kick') {
                legOffset = 15; // 踢腿
            } else if (this.attackType === 'uppercut') {
                armHeight = 15; // 上勾拳
                armOffset = 5;
            }
        }

        // 头
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, bodyY + 10, 8, 0, Math.PI * 2);
        ctx.stroke();

        // 身体
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, bodyY + 18);
        ctx.lineTo(this.x + this.width/2, bodyY + 40);
        ctx.stroke();

        // 手臂
        ctx.beginPath();
        if (this.controls.attack === 'a') {
            // 玩家1（红色）- 左手攻击
            ctx.moveTo(this.x + this.width/2, bodyY + armHeight);
            ctx.lineTo(this.x + this.width/2 - armOffset, bodyY + 30);

            // 武器在左手
            if (this.weapon && (this.isAttacking || this.attackFrame > 0)) {
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.weapon.emoji, this.x + this.width/2 - armOffset - 5, bodyY + 30);
            }
        } else {
            // 玩家2（蓝色）- 右手攻击
            ctx.moveTo(this.x + this.width/2, bodyY + armHeight);
            ctx.lineTo(this.x + this.width/2 + armOffset, bodyY + 30);

            // 武器在右手
            if (this.weapon && (this.isAttacking || this.attackFrame > 0)) {
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.weapon.emoji, this.x + this.width/2 + armOffset + 5, bodyY + 30);
            }
        }
        ctx.stroke();

        // 腿
        if (!this.isRolling) {
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, bodyY + 40);
            ctx.lineTo(this.x + this.width/2 - legOffset, bodyY + 60);
            ctx.moveTo(this.x + this.width/2, bodyY + 40);
            ctx.lineTo(this.x + this.width/2 + legOffset, bodyY + 60);
            ctx.stroke();
        }

        // 防御/下蹲盾牌
        if (this.isBlocking) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;

            if (this.isCrouching) {
                ctx.beginPath();
                ctx.arc(this.x + this.width/2 + 10, bodyY + 35, 12, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, bodyY + 30, 15, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // 武器图标（手持状态）
        if (this.weapon && !this.isAttacking && this.attackFrame === 0) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.weapon.emoji, this.x + this.width/2, bodyY - 15);
        }

        // 攻击特效
        if (this.isAttacking || this.attackFrame > 0) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;

            if (this.attackType === 'punch') {
                // 拳击轨迹
                ctx.beginPath();
                ctx.arc(this.x + this.width/2 - armOffset - 5, bodyY + 30, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.attackType === 'kick') {
                // 踢腿轨迹
                ctx.beginPath();
                ctx.arc(this.x + this.width/2 + legOffset + 5, bodyY + 50, 5, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.attackType === 'uppercut') {
                // 上勾拳轨迹
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, bodyY + 15, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 血条和体力条
        const barWidth = 40;
        const barHeight = 4;
        const barX = this.x + this.width/2 - barWidth/2;
        const barY = bodyY - 25;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpRatio = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = hpRatio > 0.5 ? '#00ff00' : hpRatio > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY + 5, barWidth, 3);

        const staminaRatio = this.stamina / this.maxStamina;
        ctx.fillStyle = '#4dabf7';
        ctx.fillRect(barX, barY + 5, barWidth * staminaRatio, 3);

        ctx.restore();
    }
}

// Main App Component
export default function App() {
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState({
        gameOver: false,
        paused: false,
        winner: null,
        aiEnabled: false,
        hardcoreMode: false,
        soundEnabled: true,
        isMobile: false,
        showPortraitWarning: false
    });

    const [keys, setKeys] = useState({});
    const [notification, setNotification] = useState({ show: false, message: '', duration: 1500 });
    const [combo, setCombo] = useState({ show: false, text: '' });
    const [weaponStatus, setWeaponStatus] = useState({ show: false, text: '' });
    const [modeIndicator, setModeIndicator] = useState({ show: false, text: '' });

    const gameRef = useRef({
        player1: null,
        player2: null,
        weapons: [],
        weaponDropTimer: 0,
        damageTexts: [],
        particles: [],
        flyingWeapons: [],
        weaponTrails: [],
        shockwaves: [],
        stats: {
            p1: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 },
            p2: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 }
        },
        animationFrame: null,
        canvasWidth: 800,
        canvasHeight: 500
    });

    useEffect(() => {
        const initAudio = () => {
            if (!window.audioContext && gameState.soundEnabled) {
                try {
                    window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.log('Audio not supported');
                }
            }
        };

        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
    }, [gameState.soundEnabled]);

    useEffect(() => {
        const checkMobile = () => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
            setGameState(prev => ({ ...prev, isMobile }));
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const checkOrientation = () => {
            if (window.innerHeight < window.innerWidth && window.innerHeight < 500) {
                setGameState(prev => ({ ...prev, showPortraitWarning: false }));
            } else if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
                setGameState(prev => ({ ...prev, showPortraitWarning: true }));
            } else {
                setGameState(prev => ({ ...prev, showPortraitWarning: false }));
            }
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowright', ' ', 'j', 'k', 'f', 'b'].includes(key)) {
                e.preventDefault();
            }
            setKeys(prev => ({ ...prev, [key]: true }));
        };

        const handleKeyUp = (e) => {
            const key = e.key.toLowerCase();
            setKeys(prev => ({ ...prev, [key]: false }));
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const initGame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;

        const resizeCanvas = () => {
            if (!container) return;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const originalWidth = 800;
            const originalHeight = 500;
            const aspectRatio = originalWidth / originalHeight;

            let newWidth, newHeight;

            if (containerWidth / containerHeight > aspectRatio) {
                newHeight = containerHeight * 0.95;
                newWidth = newHeight * aspectRatio;
            } else {
                newWidth = containerWidth * 0.95;
                newHeight = newWidth / aspectRatio;
            }

            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';
            gameRef.current.canvasWidth = originalWidth;
            gameRef.current.canvasHeight = originalHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        gameRef.current.player1 = new Stickman(
            150, 0, '#ff6b6b',
            { left: 'a', right: 'd', jump: 'w', attack: ' ', block: 's' },
            1,
            gameRef.current.canvasWidth,
            gameRef.current.canvasHeight
        );

        gameRef.current.player2 = new Stickman(
            620, 0, '#4dabf7',
            { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', attack: 'j', block: 'k' },
            2,
            gameRef.current.canvasWidth,
            gameRef.current.canvasHeight
        );

        const groundLevel = gameRef.current.canvasHeight - 80;
        gameRef.current.player1.y = groundLevel - gameRef.current.player1.height;
        gameRef.current.player2.y = groundLevel - gameRef.current.player2.height;

        setGameState(prev => ({
            ...prev,
            gameOver: false,
            paused: false,
            winner: null
        }));

        gameRef.current.weapons = [];
        gameRef.current.damageTexts = [];
        gameRef.current.particles = [];
        gameRef.current.flyingWeapons = [];
        gameRef.current.weaponTrails = [];
        gameRef.current.shockwaves = [];
        gameRef.current.weaponDropTimer = 0;
        gameRef.current.stats = {
            p1: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 },
            p2: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 }
        };

        // 全局访问
        window.damageTexts = gameRef.current.damageTexts;
        window.particles = gameRef.current.particles;
        window.flyingWeapons = gameRef.current.flyingWeapons;
        window.weaponTrails = gameRef.current.weaponTrails;
        window.shockwaves = gameRef.current.shockwaves;

        showNotification('🔥 战斗开始！', 1500);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    const drawBackground = (ctx) => {
        const width = gameRef.current.canvasWidth;
        const height = gameRef.current.canvasHeight;

        const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(1, '#E0F6FF');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height * 0.5);

        const groundY = height - 80;
        const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
        groundGradient.addColorStop(0, '#90EE90');
        groundGradient.addColorStop(1, '#228B22');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, width, 80);

        ctx.strokeStyle = 'rgba(0, 100, 0, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, groundY);
            ctx.lineTo(i + 5, groundY - 5);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(100, 50, 20, 0, Math.PI * 2);
        ctx.arc(120, 50, 25, 0, Math.PI * 2);
        ctx.arc(140, 50, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(600, 80, 15, 0, Math.PI * 2);
        ctx.arc(620, 80, 20, 0, Math.PI * 2);
        ctx.arc(640, 80, 15, 0, Math.PI * 2);
        ctx.fill();
    };

    const drawWeapons = (ctx) => {
        gameRef.current.weapons.forEach(weapon => {
            ctx.save();

            // 落地弹跳动画
            let yOffset = 0;
            if (weapon.dropAnimation > 0) {
                yOffset = Math.sin(weapon.dropAnimation * 0.5) * 5;
            }

            ctx.shadowBlur = 15;
            ctx.shadowColor = weapon.color;

            ctx.fillStyle = weapon.color;
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(weapon.emoji, weapon.x + weapon.width/2, weapon.y + weapon.height/2 + yOffset);

            if (weapon.durability > 0) {
                const barWidth = 20;
                const barHeight = 3;
                const durabilityRatio = weapon.durability / weapon.maxDurability;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(weapon.x, weapon.y - 6 + yOffset, barWidth, barHeight);

                ctx.fillStyle = durabilityRatio > 0.5 ? '#00ff00' : durabilityRatio > 0.25 ? '#ffff00' : '#ff0000';
                ctx.fillRect(weapon.x, weapon.y - 6 + yOffset, barWidth * durabilityRatio, barHeight);
            }

            ctx.restore();
        });
    };

    const drawEffects = (ctx) => {
        // 伤害飘字
        gameRef.current.damageTexts = gameRef.current.damageTexts.filter(dt => {
            const alive = dt.update();
            if (alive) dt.draw(ctx);
            return alive;
        });

        // 粒子
        gameRef.current.particles = gameRef.current.particles.filter(p => {
            const alive = p.update();
            if (alive) p.draw(ctx);
            return alive;
        });

        // 飞行武器（拾取动画）
        gameRef.current.flyingWeapons = gameRef.current.flyingWeapons.filter(fw => {
            const alive = fw.update();
            if (alive) fw.draw(ctx);
            return alive;
        });

        // 武器挥舞轨迹
        gameRef.current.weaponTrails = gameRef.current.weaponTrails.filter(wt => {
            const alive = wt.update();
            if (alive) wt.draw(ctx);
            return alive;
        });

        // 冲击波
        gameRef.current.shockwaves = gameRef.current.shockwaves.filter(sw => {
            const alive = sw.update();
            if (alive) sw.draw(ctx);
            return alive;
        });
    };

    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gameRef.current.player1 || !gameRef.current.player2) return;

        const ctx = canvas.getContext('2d');
        const p1 = gameRef.current.player1;
        const p2 = gameRef.current.player2;

        ctx.clearRect(0, 0, gameRef.current.canvasWidth, gameRef.current.canvasHeight);

        drawBackground(ctx);

        if (!gameState.paused && !gameState.gameOver) {
            gameRef.current.weapons = gameRef.current.weapons.filter(weapon => {
                weapon.update();
                return !weapon.isExpired();
            });

            gameRef.current.weaponDropTimer++;
            if (gameRef.current.weaponDropTimer > 300) {
                const x = Math.random() * (gameRef.current.canvasWidth - 100) + 50;
                const weapon = new Weapon(x, 100, gameRef.current.canvasWidth, gameRef.current.canvasHeight);
                gameRef.current.weapons.push(weapon);
                gameRef.current.weaponDropTimer = 0;
                showNotification('✨ 武器掉落!', 800);
            }

            gameRef.current.weapons.forEach((weapon, index) => {
                if (weapon.onGround) {
                    const p1Dist = Math.abs(p1.x - weapon.x) + Math.abs(p1.y - weapon.y);
                    const p2Dist = Math.abs(p2.x - weapon.x) + Math.abs(p2.y - weapon.y);

                    if (p1Dist < 40 && !p1.weapon) {
                        p1.collectWeapon(weapon, () => {
                            gameRef.current.weapons.splice(index, 1);
                            gameRef.current.stats.p1.weaponsCollected++;
                            showNotification(`🔵 玩家1 拾取 ${weapon.name}!`, 1200);
                        });
                    } else if (p2Dist < 40 && !p2.weapon) {
                        p2.collectWeapon(weapon, () => {
                            gameRef.current.weapons.splice(index, 1);
                            gameRef.current.stats.p2.weaponsCollected++;
                            showNotification(`🔵 玩家2 拾取 ${weapon.name}!`, 1200);
                        });
                    }
                }
            });
        }

        drawWeapons(ctx);

        if (!gameState.paused && !gameState.gameOver) {
            p1.update(keys, p2);
            p2.update(keys, p1);

            if (p1.weapon && p1.weapon.durability < p1.weapon.maxDurability) {
                gameRef.current.stats.p1.damage += p1.weapon.baseDamage;
            }
            if (p2.weapon && p2.weapon.durability < p2.weapon.maxDurability) {
                gameRef.current.stats.p2.damage += p2.weapon.baseDamage;
            }

            if (p1.hp <= 0 || p2.hp <= 0) {
                const winner = p1.hp > 0 ? '玩家1' : '玩家2';
                setGameState(prev => ({
                    ...prev,
                    gameOver: true,
                    winner: winner
                }));
                showNotification(`🎉 ${winner} 获胜!`, 3000);
            }

            if (p1.combo > 1 || p2.combo > 1) {
                const maxCombo = Math.max(p1.combo, p2.combo);
                setCombo({ show: true, text: `${maxCombo} 连击!` });
            } else {
                setCombo({ show: false, text: '' });
            }

            if (p1.weapon || p2.weapon) {
                const status = [];
                if (p1.weapon) status.push(`🔵: ${p1.weapon.name}(${p1.weapon.durability})`);
                if (p2.weapon) status.push(`🔴: ${p2.weapon.name}(${p2.weapon.durability})`);
                setWeaponStatus({ show: true, text: status.join(' | ') });
            } else {
                setWeaponStatus({ show: false, text: '' });
            }
        }

        p1.draw(ctx);
        p2.draw(ctx);

        drawEffects(ctx);

        if (!gameState.gameOver) {
            gameRef.current.animationFrame = requestAnimationFrame(gameLoop);
        }
    }, [keys, gameState.paused, gameState.gameOver]);

    useEffect(() => {
        if (!gameState.gameOver && gameRef.current.player1 && gameRef.current.player2) {
            gameRef.current.animationFrame = requestAnimationFrame(gameLoop);
        }

        return () => {
            if (gameRef.current.animationFrame) {
                cancelAnimationFrame(gameRef.current.animationFrame);
            }
        };
    }, [gameLoop, gameState.gameOver]);

    const showNotification = (message, duration = 1500) => {
        setNotification({ show: true, message, duration });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, duration);
    };

    const handleStart = () => {
        initGame();
    };

    const handlePause = () => {
        setGameState(prev => {
            const newPaused = !prev.paused;
            if (newPaused) {
                showNotification('⏸️ 暂停', 800);
            } else {
                showNotification('▶️ 继续', 800);
            }
            return { ...prev, paused: newPaused };
        });
    };

    const handleAI = () => {
        setGameState(prev => {
            const newAI = !prev.aiEnabled;
            if (gameRef.current.player2) {
                gameRef.current.player2.aiEnabled = newAI;
            }
            if (newAI) {
                showNotification('🤖 AI模式已开启', 1200);
                setModeIndicator({ show: true, text: '🤖 AI模式' });
            } else {
                showNotification('👤 玩家2手动模式', 1200);
                setModeIndicator({ show: false, text: '' });
            }
            return { ...prev, aiEnabled: newAI };
        });
    };

    const handleHardcore = () => {
        setGameState(prev => {
            const newHardcore = !prev.hardcoreMode;
            if (gameRef.current.player1 && gameRef.current.player2) {
                if (newHardcore) {
                    gameRef.current.player1.attackDamage = 20;
                    gameRef.current.player1.maxHp = 50;
                    gameRef.current.player1.hp = 50;
                    gameRef.current.player2.attackDamage = 20;
                    gameRef.current.player2.maxHp = 50;
                    gameRef.current.player2.hp = 50;
                    showNotification('💀 硬核模式! 50HP', 1500);
                    setModeIndicator({ show: true, text: '💀 硬核模式' });
                } else {
                    gameRef.current.player1.attackDamage = 10;
                    gameRef.current.player1.maxHp = 100;
                    gameRef.current.player1.hp = 100;
                    gameRef.current.player2.attackDamage = 10;
                    gameRef.current.player2.maxHp = 100;
                    gameRef.current.player2.hp = 100;
                    showNotification('❤️ 普通模式! 100HP', 1500);
                    setModeIndicator({ show: false, text: '' });
                }
            }
            return { ...prev, hardcoreMode: newHardcore };
        });
    };

    const handleReset = () => {
        if (gameRef.current.animationFrame) {
            cancelAnimationFrame(gameRef.current.animationFrame);
        }
        initGame();
    };

    const handleWeapons = () => {
        showNotification(
            '⚔️ 创意武器系统说明 (1/3)\n\n' +
            '🔥 火焰剑 - 15伤害 + 燃烧\n' +
            '⚡ 闪电锤 - 20伤害 + 击退\n' +
            '🧊 冰霜弓 - 12伤害 + 减速\n' +
            '💎 钻石匕首 - 25伤害 + 暴击\n' +
            '🪓 战斧 - 22伤害 + 眩晕\n' +
            '🎯 回旋镖 - 18伤害 + 特效\n\n' +
            '🎯 机制：每5-10秒掉落\n' +
            '🎯 靠近自动拾取\n' +
            '🎯 F/J键使用武器\n' +
            '🎯 武器有耐久度\n' +
            '💡 顶部显示武器状态',
            4000
        );
    };

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                showNotification('❌ 全屏失败', 1000);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const handleTouchStart = (key) => {
        setKeys(prev => ({ ...prev, [key]: true }));
    };

    const handleTouchEnd = (key) => {
        setKeys(prev => ({ ...prev, [key]: false }));
    };

    return (
        <div className="main-container">
            {gameState.showPortraitWarning && (
                <div className="portrait-warning show">
                    <div className="icon">📱</div>
                    <h2>请旋转设备</h2>
                    <p>建议使用横屏模式以获得最佳体验</p>
                </div>
            )}

            <div className="control-panel-left">
                <div className="player-label p1">🔴 玩家1</div>
                <div className="control-row">
                    <button
                        className={`btn jump ${keys['w'] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart('w')}
                        onTouchEnd={() => handleTouchEnd('w')}
                        onMouseDown={() => handleTouchStart('w')}
                        onMouseUp={() => handleTouchEnd('w')}
                        onMouseLeave={() => handleTouchEnd('w')}
                    >W</button>
                </div>
                <div className="control-row" style={{display: 'flex', gap: '5px'}}>
                    <button
                        className={`btn move ${keys['a'] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart('a')}
                        onTouchEnd={() => handleTouchEnd('a')}
                        onMouseDown={() => handleTouchStart('a')}
                        onMouseUp={() => handleTouchEnd('a')}
                        onMouseLeave={() => handleTouchEnd('a')}
                    >A</button>
                    <button
                        className={`btn move ${keys['d'] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart('d')}
                        onTouchEnd={() => handleTouchEnd('d')}
                        onMouseDown={() => handleTouchStart('d')}
                        onMouseUp={() => handleTouchEnd('d')}
                        onMouseLeave={() => handleTouchEnd('d')}
                    >D</button>
                </div>
                <div className="control-row">
                    <button
                        className={`btn attack ${keys[' '] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart(' ')}
                        onTouchEnd={() => handleTouchEnd(' ')}
                        onMouseDown={() => handleTouchStart(' ')}
                        onMouseUp={() => handleTouchEnd(' ')}
                        onMouseLeave={() => handleTouchEnd(' ')}
                    >👊</button>
                </div>
                <div className="control-row">
                    <button
                        className={`btn attack ${keys['s'] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart('s')}
                        onTouchEnd={() => handleTouchEnd('s')}
                        onMouseDown={() => handleTouchStart('s')}
                        onMouseUp={() => handleTouchEnd('s')}
                        onMouseLeave={() => handleTouchEnd('s')}
                    >🛡️</button>
                </div>
            </div>

            <div style={{flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative'}}>
                <div className="status-bar-top">
                    <div className="player-status-mini">
                        <div className="mini-name" style={{color: '#ff6b6b'}}>🔴 玩家1</div>
                        <div className="mini-hp">
                            <div
                                className="mini-hp-fill"
                                style={{
                                    width: `${gameRef.current.player1 ? (gameRef.current.player1.hp / gameRef.current.player1.maxHp * 100) : 100}%`,
                                    background: 'linear-gradient(90deg, #ff6b6b, #ff8787)'
                                }}
                            ></div>
                        </div>
                        <div className="mini-stamina">
                            <div
                                className="mini-stamina-fill"
                                style={{
                                    width: `${gameRef.current.player1 ? (gameRef.current.player1.stamina / gameRef.current.player1.maxStamina * 100) : 100}%`,
                                    background: 'linear-gradient(90deg, #4dabf7, #74c0fc)'
                                }}
                            ></div>
                        </div>
                    </div>
                    <div className="player-status-mini">
                        <div className="mini-name" style={{color: '#4dabf7'}}>🔵 玩家2</div>
                        <div className="mini-hp">
                            <div
                                className="mini-hp-fill"
                                style={{
                                    width: `${gameRef.current.player2 ? (gameRef.current.player2.hp / gameRef.current.player2.maxHp * 100) : 100}%`,
                                    background: 'linear-gradient(90deg, #ff6b6b, #ff8787)'
                                }}
                            ></div>
                        </div>
                        <div className="mini-stamina">
                            <div
                                className="mini-stamina-fill"
                                style={{
                                    width: `${gameRef.current.player2 ? (gameRef.current.player2.stamina / gameRef.current.player2.maxStamina * 100) : 100}%`,
                                    background: 'linear-gradient(90deg, #4dabf7, #74c0fc)'
                                }}
                            ></div>
                        </div>
                    </div>
                </div>

                {combo.show && (
                    <div className="combo-indicator show">{combo.text}</div>
                )}

                {weaponStatus.show && (
                    <div className="weapon-status show">{weaponStatus.text}</div>
                )}

                {modeIndicator.show && (
                    <div className="mode-indicator">{modeIndicator.text}</div>
                )}

                <div className="canvas-container">
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={500}
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '8px',
                            background: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 50%, #90EE90 50%, #228B22 100%)',
                            boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)'
                        }}
                    />

                    {gameState.gameOver && (
                        <div className="game-over-overlay show">
                            <div className="winner-text">{gameState.winner} 获胜!</div>
                            <button className="reset-btn" onClick={handleReset}>🔄 再战一局</button>
                        </div>
                    )}
                </div>

                <div className="bottom-controls">
                    <button className="func-btn fullscreen" onClick={handleFullscreen}>🖥️ 全屏</button>
                    <button
                        className="func-btn"
                        onClick={handlePause}
                        style={gameState.paused ? {background: 'rgba(255, 200, 100, 0.5)'} : {}}
                    >⏸️ 暂停</button>
                    <button
                        className="func-btn warning"
                        onClick={handleAI}
                        style={gameState.aiEnabled ? {background: 'rgba(255, 200, 100, 0.6)'} : {}}
                    >🤖 AI</button>
                    <button
                        className="func-btn danger"
                        onClick={handleHardcore}
                        style={gameState.hardcoreMode ? {background: 'rgba(255, 100, 100, 0.6)'} : {}}
                    >💀 硬核</button>
                    <button className="func-btn" onClick={handleReset}>🔄 重置</button>
                    <button className="func-btn" onClick={handleWeapons}>⚔️ 武器</button>
                    {!gameRef.current.player1 && (
                        <button className="func-btn" onClick={handleStart} style={{background: 'rgba(0, 255, 100, 0.3)', borderColor: 'rgba(0, 255, 100, 0.6)'}}>▶️ 开始</button>
                    )}
                </div>
            </div>

            <div className="control-panel-right">
                <div className="player-label p2">🔵 玩家2</div>
                <div className="control-row">
                    <button
                        className={`btn jump ${keys['arrowup'] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart('arrowup')}
                        onTouchEnd={() => handleTouchEnd('arrowup')}
                        onMouseDown={() => handleTouchStart('arrowup')}
                        onMouseUp={() => handleTouchEnd('arrowup')}
                        onMouseLeave={() => handleTouchEnd('arrowup')}
                    >↑</button>
                </div>
                <div className="control-row" style={{display: 'flex', gap: '5px'}}>
                    <button
                        className={`btn move ${keys['arrowleft'] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart('arrowleft')}
                        onTouchEnd={() => handleTouchEnd('arrowleft')}
                        onMouseDown={() => handleTouchStart('arrowleft')}
                        onMouseUp={() => handleTouchEnd('arrowleft')}
                        onMouseLeave={() => handleTouchEnd('arrowleft')}
                    >←</button>
                    <button
                        className={`btn move ${keys['arrowright'] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart('arrowright')}
                        onTouchEnd={() => handleTouchEnd('arrowright')}
                        onMouseDown={() => handleTouchStart('arrowright')}
                        onMouseUp={() => handleTouchEnd('arrowright')}
                        onMouseLeave={() => handleTouchEnd('arrowright')}
                    >→</button>
                </div>
                <div className="control-row">
                    <button
                        className={`btn attack ${keys['j'] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart('j')}
                        onTouchEnd={() => handleTouchEnd('j')}
                        onMouseDown={() => handleTouchStart('j')}
                        onMouseUp={() => handleTouchEnd('j')}
                        onMouseLeave={() => handleTouchEnd('j')}
                    >👊</button>
                </div>
                <div className="control-row">
                    <button
                        className={`btn attack ${keys['k'] ? 'active' : ''}`}
                        onTouchStart={() => handleTouchStart('k')}
                        onTouchEnd={() => handleTouchEnd('k')}
                        onMouseDown={() => handleTouchStart('k')}
                        onMouseUp={() => handleTouchEnd('k')}
                        onMouseLeave={() => handleTouchEnd('k')}
                    >🦶</button>
                </div>
            </div>

            {notification.show && (
                <div className="notification show" style={{whiteSpace: 'pre-line'}}>
                    {notification.message}
                </div>
            )}
        </div>
    );
}
