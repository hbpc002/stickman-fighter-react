// 夸张火柴人 - 精灵动画版
// 支持夸张动作和动态效果

import { exaggeratedSpriteAnimation } from './ExaggeratedSpriteAnimation.js';

export class ExaggeratedStickman {
    constructor(x, y, color, controls, playerNum, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.controls = controls;
        this.playerNum = playerNum;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // 夸张的物理属性
        this.vx = 0;
        this.vy = 0;
        this.width = 45;  // 原始宽度
        this.height = 90; // 原始高度
        this.speed = 4.5; // 稍微加快
        this.jumpPower = 14; // 更高的跳跃
        this.gravity = 0.65;

        // 状态
        this.hp = 100;
        this.maxHp = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.staminaRegen = 0.4;

        // 动作状态
        this.isJumping = false;
        this.isCrouching = false;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackFrame = 0;
        this.attackType = 'punch';

        this.isBlocking = false;
        this.isRolling = false;
        this.isCharging = false;
        this.chargeAttack = 0;

        this.isVictory = false;
        this.victoryFrame = 0;
        this.victoryTimer = 0;

        // 受伤状态
        this.hitFlashTimer = 0;
        this.hurtAnimation = 0;

        // 燃烧/减速/眩晕
        this.burnDamage = 0;
        this.burnTimer = 0;
        this.slowTimer = 0;
        this.stunTimer = 0;

        // 连击
        this.combo = 0;
        this.lastHitTime = 0;

        // 武器
        this.weapon = null;

        // 精灵动画状态
        this.currentAction = 'idle';
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.frameDuration = 1000 / 12;

        // 动作映射
        this.actionMap = {
            idle: 'idle',
            walking: 'walk',
            running: 'run',
            attacking: 'attack_slash',
            hurt: 'hurt',
            victory: 'victory',
            jumping: 'idle',
            crouching: 'idle',
            rolling: 'run',
            charging: 'idle'
        };

        // 夸张特效
        this.impactEffects = [];
        this.trailPoints = [];
    }

    // ==================== 更新逻辑 ====================

    update(keys, opponent, deltaTime = 16) {
        // 胜利状态
        if (this.isVictory) {
            this.updateVictoryAnimation(deltaTime);
            this.updateEffects();
            return;
        }

        // 燃烧伤害
        if (this.burnTimer > 0) {
            this.burnTimer--;
            if (this.burnTimer % 30 === 0) {
                this.hp -= this.burnDamage;
                this.createDamageEffect(this.burnDamage, false);
            }
        }

        // 减速
        if (this.slowTimer > 0) this.slowTimer--;

        // 眩晕
        if (this.stunTimer > 0) {
            this.stunTimer--;
            return;
        }

        // 闪烁
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        // 受伤动画
        if (this.hurtAnimation > 0) this.hurtAnimation--;

        // 翻滚
        if (this.isRolling) {
            this.updateRoll();
            return;
        }

        // 蓄力
        if (this.isCharging) {
            this.updateCharge();
        }

        // 玩家控制
        this.updatePlayerControl(keys, opponent);

        // 更新特效
        this.updateEffects();

        // 更新动画
        this.updateAnimation(deltaTime);

        // 更新拖影轨迹
        this.updateTrail();

        this.currentFrame++;
    }

    updatePlayerControl(keys, opponent) {
        const speed = this.slowTimer > 0 ? this.speed * 0.5 : this.speed;
        this.isCrouching = keys[this.controls.block] && !this.isJumping;

        // 移动 - 更夸张的速度感
        if (keys[this.controls.left] && !this.isCrouching && !this.isAttacking) {
            this.vx = -speed;
            this.addTrail();
        } else if (keys[this.controls.right] && !this.isCrouching && !this.isAttacking) {
            this.vx = speed;
            this.addTrail();
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

        // 长按蓄力
        if (keys[this.controls.attack] && this.attackCooldown <= 0 && this.stamina >= 10) {
            if (!this.isCharging) {
                this.isCharging = true;
                this.chargeAttack = 0;
            }
        } else if (this.isCharging) {
            this.releaseChargeAttack(opponent);
        }

        // 防御/下蹲
        if (this.isCrouching) {
            this.isBlocking = true;
            this.stamina -= this.blockStaminaDrain || 0.5;
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

        // 边界
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.canvasWidth) this.x = this.canvasWidth - this.width;

        // 体力恢复
        if (this.stamina < this.maxStamina && !this.isAttacking && !this.isBlocking && !this.isRolling && !this.isCharging) {
            this.stamina += this.staminaRegen;
        }

        // 攻击冷却
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackFrame > 0) this.attackFrame--;

        // 连击重置
        if (Date.now() - this.lastHitTime > 2000) {
            this.combo = 0;
        }
    }

    updateCharge() {
        this.chargeAttack++;
        this.vx = 0;

        // 蓄力特效
        if (this.chargeAttack % 5 === 0 && window.particles) {
            window.particles.push({
                x: this.x + this.width / 2,
                y: this.y + 30,
                color: this.color,
                type: 'charge'
            });
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

        let damage = this.attackDamage || 10;
        let attackType = 'punch';

        if (this.chargeAttack > 50) {
            attackType = 'uppercut';
            damage *= 2.5;
        } else if (this.chargeAttack > 30) {
            attackType = 'kick';
            damage *= 1.8;
        } else {
            damage *= 1.3;
        }

        this.attackType = attackType;
        this.attack(opponent, damage);
        this.chargeAttack = 0;
    }

    updateRoll() {
        this.x += this.rollDirection * 6;
        this.vx = this.rollDirection * 6;
        this.rollFrame++;

        if (this.rollFrame > 15) {
            this.isRolling = false;
            this.rollFrame = 0;
        }

        // 翻滚无敌
        if (this.rollFrame < 12) {
            this.hitFlashTimer = 1;
        }

        // 翻滚轨迹
        if (this.rollFrame % 3 === 0 && window.particles) {
            window.particles.push({
                x: this.x + this.width / 2,
                y: this.y + 30,
                color: this.color,
                type: 'roll'
            });
        }
    }

    startRoll() {
        if (this.isRolling) return;

        this.isRolling = true;
        this.rollFrame = 0;
        this.rollDirection = this.controls.attack === 'a' ? 1 : -1;
        this.attackCooldown = 20;
        this.stamina -= 15;
    }

    attack(opponent, customDamage = null) {
        if (!opponent || this.attackCooldown > 0) return;

        this.isAttacking = true;
        this.attackFrame = 10;
        this.attackCooldown = 30;
        this.stamina -= 10;

        let range = this.attackRange || 50;
        let baseDamage = customDamage || this.attackDamage || 10;

        if (this.attackType === 'kick') {
            range += 10;
            baseDamage += 2;
        } else if (this.attackType === 'uppercut') {
            baseDamage += 5;
        }

        const distance = Math.abs(this.x - opponent.x);
        if (distance <= range) {
            let damage = baseDamage;

            // 暴击
            if (Math.random() < 0.15) {
                damage = Math.floor(damage * 1.5);
            }

            // 连击
            this.combo++;
            if (this.combo > 1) {
                damage += Math.floor(this.combo * 1.5);
            }

            // 防御减伤
            if (opponent.isBlocking && opponent.stamina > 0) {
                damage = Math.floor(damage * 0.3);
                opponent.stamina -= 5;
            }

            opponent.takeDamage(damage, this, this.combo > 1);
            this.lastHitTime = Date.now();

            // 冲击波
            if (window.shockwaves) {
                window.shockwaves.push({
                    x: opponent.x + opponent.width / 2,
                    y: opponent.y + 20,
                    color: this.color,
                    frame: 0
                });
            }

            // 音效
            this.playSound(this.attackType === 'kick' ? 'kick' : 'punch');

            // 攻击后退
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
        if (distance <= (this.attackRange || 50) + 30) {
            let damage = this.weapon.baseDamage || 15;

            // 武器特效
            if (window.weaponTrails) {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        window.weaponTrails.push({
                            x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
                            y: this.y + 20 + (Math.random() - 0.5) * 20,
                            color: this.weapon.color,
                            emoji: this.weapon.emoji
                        });
                    }, i * 30);
                }
            }

            // 特殊效果
            if (this.weapon.special === 'burn') {
                opponent.burnDamage = 2;
                opponent.burnTimer = 150;
            } else if (this.weapon.special === 'knockback') {
                opponent.vx = (opponent.x < this.x ? -1 : 1) * 8;
            } else if (this.weapon.special === 'slow') {
                opponent.slowTimer = 120;
            } else if (this.weapon.special === 'stun') {
                opponent.stunTimer = 30;
            }

            opponent.takeDamage(damage, this);
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
        if (window.flyingWeapons) {
            window.flyingWeapons.push({
                weapon: weapon,
                x: this.x + this.width / 2,
                y: this.y + 10
            });
        }

        setTimeout(() => {
            this.weapon = weapon;
            if (callback) callback();

            if (window.particles) {
                for (let i = 0; i < 10; i++) {
                    window.particles.push({
                        x: this.x + this.width / 2,
                        y: this.y + 20,
                        color: weapon.color,
                        type: 'special'
                    });
                }
            }
        }, 300);

        this.playSound('weapon_pickup');
    }

    // ==================== 动画系统 ====================

    updateAnimation(deltaTime) {
        const gameState = this.determineAction();
        const newAction = this.actionMap[gameState];

        if (newAction !== this.currentAction) {
            this.currentAction = newAction;
            this.currentFrame = 0;
            this.animationTimer = 0;

            const fps = exaggeratedSpriteAnimation.getFPS(newAction) || 12;
            this.frameDuration = 1000 / fps;
        }

        this.animationTimer += deltaTime;

        while (this.animationTimer >= this.frameDuration) {
            this.animationTimer -= this.frameDuration;
            this.currentFrame++;

            const frameCount = exaggeratedSpriteAnimation.getFrameCount(this.currentAction);
            if (frameCount > 0 && this.currentFrame >= frameCount) {
                // 一次性动作
                if (['attack_slash', 'hurt', 'victory'].includes(this.currentAction)) {
                    this.currentFrame = frameCount - 1;

                    if (this.currentAction === 'attack_slash') {
                        setTimeout(() => { this.isAttacking = false; }, 50);
                    }
                    if (this.currentAction === 'hurt') {
                        setTimeout(() => { this.hurtAnimation = 0; }, 100);
                    }
                } else {
                    this.currentFrame = 0;
                }
            }
        }
    }

    determineAction() {
        if (this.hurtAnimation > 0) return 'hurt';
        if (this.isRolling) return 'rolling';
        if (this.isAttacking) return 'attacking';
        if (this.isCharging) return 'charging';
        if (this.isCrouching) return 'crouching';
        if (this.isJumping) return 'jumping';
        if (Math.abs(this.vx) > 3) {
            return Math.abs(this.vx) > 4 ? 'running' : 'walking';
        }
        return 'idle';
    }

    // ==================== 绘制 ====================

    draw(ctx) {
        // 尝试使用精灵动画
        const hasSprite = exaggeratedSpriteAnimation.isLoaded(this.currentAction);

        if (hasSprite) {
            this.drawWithSprites(ctx);
        } else {
            // 回退到程序化绘制
            this.drawProgrammatic(ctx);
        }

        // 绘制额外特效
        this.drawExtraEffects(ctx);

        // 血条和体力条
        this.drawBars(ctx);

        // 武器图标
        if (this.weapon && !this.isAttacking && this.attackFrame === 0) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.weapon.emoji, this.x + this.width / 2, this.y - 15);
        }
    }

    drawWithSprites(ctx) {
        ctx.save();

        // 游戏状态传递给精灵系统
        const gameState = {
            vx: this.vx,
            isAttacking: this.isAttacking,
            direction: this.x < this.canvasWidth / 2 ? 1 : -1,
            hitFlashTimer: this.hitFlashTimer,
            victoryFrame: this.victoryFrame
        };

        // 闪烁效果
        if (this.hitFlashTimer > 0 && this.hitFlashTimer % 2 === 0) {
            ctx.globalAlpha = 0.5;
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
            ctx.arc(this.x + this.width / 2, this.y - 10, 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 翻滚特效
        if (this.isRolling) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + 30, 15, 0, Math.PI * 2);
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
            ctx.arc(this.x + this.width / 2, this.y + 30, 10 + this.chargeAttack / 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 计算绘制位置
        let drawX = this.x;
        let drawY = this.y;
        let drawWidth = this.width;
        let drawHeight = this.height;

        // 状态调整
        if (this.isCrouching) {
            drawY += 15;
            drawHeight -= 15;
        }
        if (this.hurtAnimation > 0) {
            drawY += 5;
        }
        if (this.isJumping) {
            drawY -= 5;
        }

        // 精灵绘制
        exaggeratedSpriteAnimation.draw(
            ctx,
            this.currentAction,
            drawX,
            drawY,
            drawWidth,
            drawHeight,
            this.currentFrame,
            gameState
        );

        ctx.restore();
    }

    drawProgrammatic(ctx) {
        // 程序化绘制（回退方案）
        ctx.save();

        // 闪烁
        if (this.hitFlashTimer > 0 && this.hitFlashTimer % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 状态效果
        if (this.burnTimer > 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff4500';
        }
        if (this.slowTimer > 0) {
            ctx.globalAlpha = 0.7;
        }

        // 绘制火柴人
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        let bodyY = this.y;
        let legOffset = 8;
        let armOffset = this.isAttacking ? 10 : 5;
        let armHeight = 22;

        // 姿势调整
        if (this.isCrouching) {
            bodyY = this.y + 15;
            legOffset = 4;
        } else if (this.hurtAnimation > 0) {
            bodyY += 5;
        } else if (this.isJumping) {
            legOffset = 12;
        } else if (this.isRolling) {
            bodyY = this.y + 20;
            legOffset = 0;
        }

        // 攻击类型
        if (this.isAttacking) {
            if (this.attackType === 'kick') {
                legOffset = 15;
            } else if (this.attackType === 'uppercut') {
                armHeight = 15;
                armOffset = 5;
            }
        }

        // 头
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, bodyY + 10, 8, 0, Math.PI * 2);
        ctx.stroke();

        // 身体
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, bodyY + 18);
        ctx.lineTo(this.x + this.width / 2, bodyY + 40);
        ctx.stroke();

        // 手臂
        ctx.beginPath();
        if (this.controls.attack === 'a') {
            ctx.moveTo(this.x + this.width / 2, bodyY + armHeight);
            ctx.lineTo(this.x + this.width / 2 - armOffset, bodyY + 30);
        } else {
            ctx.moveTo(this.x + this.width / 2, bodyY + armHeight);
            ctx.lineTo(this.x + this.width / 2 + armOffset, bodyY + 30);
        }
        ctx.stroke();

        // 腿
        if (!this.isRolling) {
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, bodyY + 40);
            ctx.lineTo(this.x + this.width / 2 - legOffset, bodyY + 60);
            ctx.moveTo(this.x + this.width / 2, bodyY + 40);
            ctx.lineTo(this.x + this.width / 2 + legOffset, bodyY + 60);
            ctx.stroke();
        }

        // 防御
        if (this.isBlocking) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, bodyY + 30, 15, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawBars(ctx) {
        const barWidth = 40;
        const barHeight = 4;
        const barX = this.x + this.width / 2 - barWidth / 2;
        const barY = this.y - 25;

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
    }

    drawExtraEffects(ctx) {
        // 连击特效
        if (this.combo > 2 && window.particles) {
            // 可以在这里添加连击数字显示
        }
    }

    // ==================== 特效 ====================

    createDamageEffect(damage, isCrit) {
        if (window.damageTexts) {
            window.damageTexts.push({
                x: this.x + this.width / 2,
                y: this.y + 10,
                damage: damage,
                isCrit: isCrit || damage > 20,
                alpha: 1,
                vy: -2
            });
        }
    }

    createJumpEffect() {
        if (window.particles) {
            for (let i = 0; i < 5; i++) {
                window.particles.push({
                    x: this.x + this.width / 2,
                    y: this.y + this.height,
                    color: this.color,
                    type: 'jump'
                });
            }
        }
    }

    addTrail() {
        if (this.animationFrame % 3 === 0 && window.particles) {
            window.particles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                color: this.color,
                type: 'trail'
            });
        }
    }

    updateTrail() {
        if (Math.abs(this.vx) > 2 && this.currentFrame % 4 === 0) {
            this.addTrail();
        }
    }

    updateEffects() {
        // 更新特效数组（如果存在）
        if (window.damageTexts) {
            window.damageTexts = window.damageTexts.filter(t => {
                t.y += t.vy;
                t.alpha -= 0.02;
                return t.alpha > 0;
            });
        }

        if (window.particles) {
            window.particles = window.particles.filter(p => {
                if (p.type === 'jump') {
                    p.y -= 2;
                } else if (p.type === 'trail') {
                    p.alpha = (p.alpha || 1) - 0.05;
                    return p.alpha > 0;
                }
                return true;
            });
        }

        if (window.shockwaves) {
            window.shockwaves = window.shockwaves.filter(s => {
                s.frame++;
                return s.frame < 10;
            });
        }
    }

    updateVictoryAnimation(deltaTime) {
        if (this.isVictory) {
            this.victoryTimer++;
            this.victoryFrame = Math.floor(this.victoryTimer / 5) % 4;

            // 胜利粒子
            if (this.victoryTimer % 10 === 0 && window.particles) {
                window.particles.push({
                    x: this.x + this.width / 2 + (Math.random() - 0.5) * 30,
                    y: this.y + 10,
                    color: '#ffd93d',
                    type: 'victory'
                });
            }
        }
    }

    setVictoryAnimation() {
        this.isVictory = true;
        this.victoryFrame = 0;
        this.victoryTimer = 0;
    }

    // ==================== 音效 ====================

    playSound(type) {
        if (!window.audioContext || window.soundEnabled === false) return;

        try {
            const oscillator = window.audioContext.createOscillator();
            const gainNode = window.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(window.audioContext.destination);

            switch (type) {
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
        } catch (e) { }
    }

    // ==================== 工具 ====================

    getAnimationInfo() {
        return {
            action: this.currentAction,
            frame: this.currentFrame,
            timer: this.animationTimer,
            duration: this.frameDuration,
            hasSprite: exaggeratedSpriteAnimation.isLoaded(this.currentAction)
        };
    }
}
