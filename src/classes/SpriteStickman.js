// 精灵动画版Stickman - 扩展基础Stickman类
import { Stickman } from './Stickman.js';
import { spriteAnimation } from './SpriteAnimation.js';

export class SpriteStickman extends Stickman {
    constructor(x, y, color, controls, playerNum, canvasWidth, canvasHeight) {
        super(x, y, color, controls, playerNum, canvasWidth, canvasHeight);

        // 精灵动画相关状态
        this.currentAction = 'idle';
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.frameDuration = 1000 / 12; // 默认12fps

        // 是否使用精灵动画（如果精灵图未加载则回退到程序化绘制）
        this.useSpriteAnimation = false;

        // 动作映射：游戏状态 -> 精灵动作
        this.actionMap = {
            idle: 'idle',
            walking: 'walk',
            running: 'run',
            attacking: 'attack_slash',
            hurt: 'hurt',
            victory: 'victory',
            jumping: 'idle', // 跳跃使用idle但有垂直偏移
            crouching: 'idle', // 下蹲使用idle但有垂直偏移
            rolling: 'run', // 翻滚使用run
            charging: 'idle' // 蓄力使用idle
        };
    }

    // 检查精灵动画是否可用
    checkSpriteAvailability() {
        this.useSpriteAnimation = spriteAnimation.isLoaded(this.currentAction);
        return this.useSpriteAnimation;
    }

    // 根据当前状态确定动作
    determineAction() {
        // 优先级从高到低
        if (this.hurtAnimation > 0) {
            return 'hurt';
        }
        if (this.isRolling) {
            return 'rolling';
        }
        if (this.isAttacking) {
            return 'attacking';
        }
        if (this.isCharging) {
            return 'charging';
        }
        if (this.isCrouching) {
            return 'crouching';
        }
        if (this.isJumping) {
            return 'jumping';
        }
        if (Math.abs(this.vx) > 3) {
            return Math.abs(this.vx) > 4 ? 'running' : 'walking';
        }
        return 'idle';
    }

    // 更新动画帧
    updateAnimation(deltaTime) {
        const gameState = this.determineAction();
        const newAction = this.actionMap[gameState];

        // 如果动作改变，重置帧
        if (newAction !== this.currentAction) {
            this.currentAction = newAction;
            this.currentFrame = 0;
            this.animationTimer = 0;

            // 更新帧持续时间
            const fps = spriteAnimation.getFPS(newAction) || 12;
            this.frameDuration = 1000 / fps;
        }

        // 更新帧计时器
        this.animationTimer += deltaTime;

        // 需要换帧
        while (this.animationTimer >= this.frameDuration) {
            this.animationTimer -= this.frameDuration;
            this.currentFrame++;

            // 循环动画
            const frameCount = spriteAnimation.getFrameCount(this.currentAction);
            if (frameCount > 0 && this.currentFrame >= frameCount) {
                // 一次性动作重置
                if (this.currentAction === 'attack_slash' ||
                    this.currentAction === 'hurt' ||
                    this.currentAction === 'victory') {
                    this.currentFrame = frameCount - 1; // 停在最后一帧

                    // 动画结束后重置状态
                    if (this.currentAction === 'attack_slash') {
                        setTimeout(() => {
                            if (this.isAttacking) this.isAttacking = false;
                        }, 50);
                    }
                    if (this.currentAction === 'hurt') {
                        setTimeout(() => {
                            this.hurtAnimation = 0;
                        }, 100);
                    }
                } else {
                    this.currentFrame = 0; // 循环
                }
            }
        }
    }

    // 重写draw方法，支持精灵动画
    draw(ctx) {
        // 尝试使用精灵动画
        if (this.useSpriteAnimation) {
            this.drawWithSprites(ctx);
        } else {
            // 回退到原始绘制
            super.draw(ctx);

            // 检查是否可以切换到精灵动画
            if (spriteAnimation.isLoaded(this.currentAction)) {
                this.checkSpriteAvailability();
            }
        }
    }

    // 使用精灵图绘制
    drawWithSprites(ctx) {
        ctx.save();

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
            ctx.arc(this.x + this.width/2, this.y - 10, 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 计算绘制位置（考虑状态偏移）
        let drawX = this.x;
        let drawY = this.y;
        let drawWidth = this.width;
        let drawHeight = this.height;

        // 翻滚特效
        if (this.isRolling) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + 30, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 翻滚时稍微放大
            drawY += 20;
            drawHeight -= 20;
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

        // 下蹲调整
        if (this.isCrouching) {
            drawY += 15;
            drawHeight -= 15;
        }

        // 受伤调整
        if (this.hurtAnimation > 0) {
            drawY += 5;
        }

        // 跳跃调整（精灵图中不体现，通过位置偏移）
        // 精灵图绘制
        const spriteDrawn = spriteAnimation.draw(
            ctx,
            this.currentAction,
            drawX - 5, // 微调位置
            drawY - 5,
            drawWidth + 10,
            drawHeight + 10,
            this.currentFrame
        );

        // 如果精灵绘制失败，回退到程序化绘制
        if (!spriteDrawn) {
            super.draw(ctx);
        }

        // 绘制额外特效（这些保持不变）
        this.drawExtraEffects(ctx);

        // 血条和体力条
        this.drawBars(ctx, drawY);

        // 武器图标
        if (this.weapon && !this.isAttacking && this.attackFrame === 0) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.weapon.emoji, this.x + this.width/2, drawY - 15);
        }

        ctx.restore();
    }

    // 绘制血条和体力条
    drawBars(ctx, bodyY) {
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
    }

    // 重写update方法，添加动画更新
    update(keys, opponent, deltaTime = 16) {
        // 调用父类update
        super.update(keys, opponent);

        // 更新精灵动画
        this.updateAnimation(deltaTime);
    }

    // 获取当前动作信息（用于调试）
    getAnimationInfo() {
        return {
            action: this.currentAction,
            frame: this.currentFrame,
            timer: this.animationTimer,
            duration: this.frameDuration,
            useSprites: this.useSpriteAnimation
        };
    }
}
