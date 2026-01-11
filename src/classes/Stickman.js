import { DamageText, Particle, FlyingWeapon, WeaponTrail, Shockwave, ComboEffect, SpecialAttackEffect } from './VisualEffects.js';

// Stickman player class with enhanced animations and combo system
export class Stickman {
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
        this.width = 45;
        this.height = 90;
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

        // 新增：连击特效队列
        this.comboEffects = [];

        // 新增：特殊攻击特效
        this.specialEffects = [];

        // 新增：移动轨迹
        this.moveTrail = [];

        // 新增：蓄力攻击
        this.chargeAttack = 0;
        this.isCharging = false;
    }

    update(keys, opponent) {
        // 更新胜利动画
        if (this.isVictory) {
            this.updateVictoryAnimation();
            // 胜利状态下只更新特效和动画，不进行其他更新
            this.updateEffects();
            return;
        }

        // 更新燃烧伤害
        if (this.burnTimer > 0) {
            this.burnTimer--;
            if (this.burnTimer % 30 === 0) {
                this.hp -= this.burnDamage;
                this.createDamageEffect(this.burnDamage, false);
            }
        }

        // 更新减速
        if (this.slowTimer > 0) {
            this.slowTimer--;
        }

        // 更新眩晕
        if (this.stunTimer > 0) {
            this.stunTimer--;
            return;
        }

        // 更新闪烁
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer--;
        }

        // 更新受伤动画
        if (this.hurtAnimation > 0) {
            this.hurtAnimation--;
        }

        // 更新翻滚
        if (this.isRolling) {
            this.updateRoll();
            return;
        }

        // 更新蓄力
        if (this.isCharging) {
            this.updateCharge();
        }

        // AI控制
        if (this.aiEnabled && opponent) {
            this.updateAI(opponent);
            return;
        }

        // 玩家控制
        this.updatePlayerControl(keys, opponent);

        // 更新特效
        this.updateEffects();

        // 更新移动轨迹
        this.updateMoveTrail();

        this.animationFrame++;
    }

    updatePlayerControl(keys, opponent) {
        const speed = this.slowTimer > 0 ? this.speed * 0.5 : this.speed;
        this.isCrouching = keys[this.controls.block] && this.isJumping === false;

        // 左右移动
        if (keys[this.controls.left] && !this.isCrouching && !this.isAttacking) {
            this.vx = -speed;
            this.addMoveTrail();
        } else if (keys[this.controls.right] && !this.isCrouching && !this.isAttacking) {
            this.vx = speed;
            this.addMoveTrail();
        } else {
            this.vx *= 0.8;
        }

        // 跳跃
        if (keys[this.controls.jump] && !this.isJumping && !this.isCrouching) {
            this.vy = -this.jumpPower;
            this.isJumping = true;
            this.stamina -= 5;
            this.createJumpEffect();
        }

        // 长按蓄力攻击
        if (keys[this.controls.attack] && this.attackCooldown <= 0 && this.stamina >= 10) {
            if (!this.isCharging) {
                this.isCharging = true;
                this.chargeAttack = 0;
            }
        } else if (this.isCharging) {
            // 释放蓄力攻击
            this.releaseChargeAttack(opponent);
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
        if (this.stamina < this.maxStamina && !this.isAttacking && !this.isBlocking && !this.isRolling && !this.isCharging) {
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
    }

    updateCharge() {
        this.chargeAttack++;
        this.vx = 0; // 蓄力时不能移动

        // 蓄力特效
        if (this.chargeAttack % 5 === 0 && window.particles) {
            window.particles.push(
                new Particle(
                    this.x + this.width / 2,
                    this.y + 30,
                    this.color,
                    'special'
                )
            );
        }

        // 蓄力满自动释放（如果还在按）
        if (this.chargeAttack > 60) {
            // 自动释放，但需要对手在范围内
            // 这里不自动释放，等待按键释放
        }
    }

    releaseChargeAttack(opponent) {
        this.isCharging = false;

        if (!opponent) return;

        const distance = Math.abs(this.x - opponent.x);
        if (distance > this.attackRange + 30) {
            this.chargeAttack = 0;
            return;
        }

        // 根据蓄力时间决定攻击类型
        let damage = this.attackDamage;
        let attackType = 'punch';

        if (this.chargeAttack > 50) {
            // 超级蓄力
            attackType = 'uppercut';
            damage *= 2.5;
            this.createSpecialAttackEffect('uppercut');
        } else if (this.chargeAttack > 30) {
            // 中等蓄力
            attackType = 'kick';
            damage *= 1.8;
            this.createSpecialAttackEffect('kick');
        } else {
            // 普通蓄力
            damage *= 1.3;
        }

        this.attackType = attackType;
        this.attack(opponent, damage);
        this.chargeAttack = 0;
    }

    updateRoll() {
        this.rollFrame++;
        this.x += this.rollDirection * 6;
        this.vx = this.rollDirection * 6;

        if (this.rollFrame > 15) {
            this.isRolling = false;
            this.rollFrame = 0;
        }

        // 翻滚时无敌
        if (this.rollFrame < 12) {
            this.hitFlashTimer = 1;
        }

        // 翻滚轨迹特效
        if (this.rollFrame % 3 === 0 && window.particles) {
            window.particles.push(
                new Particle(
                    this.x + this.width / 2,
                    this.y + 30,
                    this.color,
                    'normal'
                )
            );
        }
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

        // 翻滚特效
        this.createSpecialAttackEffect('roll');
    }

    updateAI(opponent) {
        this.aiTimer++;

        const speed = this.slowTimer > 0 ? this.speed * 0.5 : this.speed;
        const distance = Math.abs(this.x - opponent.x);

        // AI状态机
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
                    } else if (Math.random() < 0.2) {
                        // AI蓄力攻击
                        this.isCharging = true;
                        this.chargeAttack = 40;
                        this.releaseChargeAttack(opponent);
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

        // 物理更新
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

    attack(opponent, customDamage = null) {
        if (!opponent || this.attackCooldown > 0) return;

        this.isAttacking = true;
        this.attackFrame = 10;
        this.attackCooldown = 30;
        this.stamina -= 10;

        // 根据攻击类型调整范围和伤害
        let range = this.attackRange;
        let baseDamage = customDamage || this.attackDamage;

        if (this.attackType === 'kick') {
            range += 10;
            baseDamage += 2;
            this.createSpecialAttackEffect('kick');
        } else if (this.attackType === 'uppercut') {
            baseDamage += 5;
            this.createSpecialAttackEffect('uppercut');
        }

        const distance = Math.abs(this.x - opponent.x);
        if (distance <= range) {
            let damage = baseDamage;

            // 暴击
            if (Math.random() < 0.15) {
                damage = Math.floor(damage * 1.5);
            }

            // 连击加成
            this.combo++;
            if (this.combo > 1) {
                damage += Math.floor(this.combo * 1.5);
                this.createComboEffect(this.combo);
            }

            // 防御减伤
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

            // 创建武器挥舞轨迹
            if (this.weapon && window.weaponTrails) {
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

            // 音效
            if (this.controls.attack === 'a') {
                this.playSound('punch');
            } else {
                this.playSound('kick');
            }

            // 攻击后的小后退
            const direction = this.x < opponent.x ? 1 : -1;
            this.vx = -direction * 2;
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

            // 特殊效果处理
            switch (this.weapon.special) {
                case 'burn':
                    opponent.burnDamage = 2;
                    opponent.burnTimer = 150;
                    if (window.particles) {
                        for (let i = 0; i < 5; i++) {
                            window.particles.push(
                                new Particle(
                                    opponent.x + opponent.width / 2,
                                    opponent.y + 20,
                                    '#ff4500',
                                    'special'
                                )
                            );
                        }
                    }
                    break;
                case 'knockback':
                    opponent.vx = (opponent.x < this.x ? -1 : 1) * 8;
                    break;
                case 'slow':
                    opponent.slowTimer = 120;
                    if (window.particles) {
                        for (let i = 0; i < 8; i++) {
                            window.particles.push(
                                new Particle(
                                    opponent.x + opponent.width / 2,
                                    opponent.y + 20,
                                    '#00bfff',
                                    'normal'
                                )
                            );
                        }
                    }
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
                case 'holy':
                    damage += 10;
                    if (window.shockwaves) {
                        window.shockwaves.push(
                            new Shockwave(
                                opponent.x + opponent.width / 2,
                                opponent.y + 20,
                                '#ffd700'
                            )
                        );
                    }
                    if (window.particles) {
                        for (let i = 0; i < 12; i++) {
                            window.particles.push(
                                new Particle(
                                    opponent.x + opponent.width / 2,
                                    opponent.y + 20,
                                    '#ffd700',
                                    'special'
                                )
                            );
                        }
                    }
                    break;
                case 'poison':
                    if (window.poisonClouds) {
                        window.poisonClouds.push(
                            new PoisonCloud(
                                opponent.x + opponent.width / 2,
                                opponent.y + 20
                            )
                        );
                    }
                    opponent.burnDamage = 1;
                    opponent.burnTimer = 100;
                    break;
                case 'thunder':
                    if (window.lightningBolts) {
                        window.lightningBolts.push(
                            new LightningBolt(
                                this.x + this.width / 2,
                                this.y + 20,
                                opponent.x + opponent.width / 2,
                                opponent.y + 20,
                                '#4169e1'
                            )
                        );
                    }
                    damage += 8;
                    break;
                case 'laser':
                    if (window.laserTrails) {
                        for (let i = 0; i < 5; i++) {
                            setTimeout(() => {
                                window.laserTrails.push(
                                    new LaserTrail(
                                        this.x + this.width / 2 + (Math.random() - 0.5) * 30,
                                        this.y + 20 + (Math.random() - 0.5) * 30,
                                        '#00ff00'
                                    )
                                );
                            }, i * 20);
                        }
                    }
                    damage = Math.floor(damage * 0.9);
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

        this.createDamageEffect(damage, isCrit);
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

    // 新增：创建伤害特效
    createDamageEffect(damage, isCrit) {
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
    }

    // 新增：创建跳跃特效
    createJumpEffect() {
        if (window.particles) {
            for (let i = 0; i < 5; i++) {
                window.particles.push(
                    new Particle(
                        this.x + this.width / 2,
                        this.y + this.height,
                        this.color,
                        'normal'
                    )
                );
            }
        }
    }

    // 新增：创建连击特效
    createComboEffect(combo) {
        if (combo > 2 && window.particles) {
            // 连击数字特效
            const effect = new ComboEffect(
                this.x + this.width / 2,
                this.y - 20,
                combo
            );
            this.comboEffects.push(effect);
        }
    }

    // 新增：创建特殊攻击特效
    createSpecialAttackEffect(type) {
        if (window.particles) {
            const effect = new SpecialAttackEffect(
                this.x + this.width / 2,
                this.y + 20,
                type,
                this.color
            );
            this.specialEffects.push(effect);
        }
    }

    // 新增：移动轨迹
    addMoveTrail() {
        if (this.animationFrame % 3 === 0 && window.particles) {
            window.particles.push(
                new Particle(
                    this.x + this.width / 2,
                    this.y + this.height / 2,
                    this.color,
                    'normal'
                )
            );
        }
    }

    // 新增：更新特效
    updateEffects() {
        // 更新连击特效
        this.comboEffects = this.comboEffects.filter(effect => {
            const alive = effect.update();
            return alive;
        });

        // 更新特殊攻击特效
        this.specialEffects = this.specialEffects.filter(effect => {
            const alive = effect.update();
            return alive;
        });
    }

    // 新增：更新移动轨迹
    updateMoveTrail() {
        if (Math.abs(this.vx) > 2 && this.animationFrame % 4 === 0) {
            this.addMoveTrail();
        }
    }

    playSound(type) {
        if (!window.audioContext || window.soundEnabled === false) return;

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

        // 蓄力特效
        if (this.isCharging) {
            ctx.save();
            const chargeAlpha = Math.min(this.chargeAttack / 60, 1);
            ctx.globalAlpha = chargeAlpha * 0.6;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + 30, 10 + this.chargeAttack / 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 胜利特效
        if (this.isVictory) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffd93d';

            // 胜利光环
            const radius = 20 + this.victoryFrame * 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + 30, radius, 0, Math.PI * 2);
            ctx.stroke();

            // 胜利星星
            const starX = this.x + this.width/2 + (this.victoryFrame % 2 === 0 ? 15 : -15);
            const starY = this.y - 10;
            ctx.beginPath();
            ctx.moveTo(starX, starY - 5);
            ctx.lineTo(starX + 2, starY - 1);
            ctx.lineTo(starX + 6, starY);
            ctx.lineTo(starX + 2, starY + 1);
            ctx.lineTo(starX, starY + 5);
            ctx.lineTo(starX - 2, starY + 1);
            ctx.lineTo(starX - 6, starY);
            ctx.lineTo(starX - 2, starY - 1);
            ctx.closePath();
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

        // 胜利姿势
        if (this.isVictory) {
            bodyY = this.y;
            legOffset = 5; // 稍微分开的站姿
            armHeight = 15; // 手臂举起
            armOffset = 15; // 双手张开
        }
        // 下蹲
        else if (this.isCrouching) {
            bodyY = this.y + 15;
            legOffset = 4;
        }
        // 受伤
        else if (this.hurtAnimation > 0) {
            bodyY += 5;
        }
        // 跳跃
        else if (this.isJumping) {
            legOffset = 12;
        }
        // 翻滚
        else if (this.isRolling) {
            bodyY = this.y + 20;
            legOffset = 0;
        }
        // 攻击类型特定姿势
        else if (this.isAttacking) {
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
        if (this.isVictory) {
            // 胜利姿势 - 双臂举起
            // 左臂
            ctx.moveTo(this.x + this.width/2, bodyY + armHeight);
            ctx.lineTo(this.x + this.width/2 - armOffset, bodyY + 15);
            // 右臂
            ctx.moveTo(this.x + this.width/2, bodyY + armHeight);
            ctx.lineTo(this.x + this.width/2 + armOffset, bodyY + 15);
        } else if (this.controls.attack === 'a') {
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

        // 绘制额外特效
        this.drawExtraEffects(ctx);
    }

    drawExtraEffects(ctx) {
        // 绘制连击特效
        this.comboEffects.forEach(effect => {
            effect.draw(ctx);
        });

        // 绘制特殊攻击特效
        this.specialEffects.forEach(effect => {
            effect.draw(ctx);
        });
    }

    // 设置胜利动画（用于程序化绘制的胜利状态）
    setVictoryAnimation() {
        // 设置胜利状态标志
        this.isVictory = true;
        this.victoryFrame = 0;
        this.victoryTimer = 0;
    }

    // 更新胜利动画（程序化绘制版本）
    updateVictoryAnimation() {
        if (this.isVictory) {
            this.victoryTimer++;
            this.victoryFrame = Math.floor(this.victoryTimer / 5) % 4; // 4帧循环
        }
    }
}
