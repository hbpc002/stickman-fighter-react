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
        // 注意：如果某个动作的精灵图不存在，会自动回退到程序化绘制
        this.actionMap = {
            idle: 'idle',
            walking: 'walk',
            running: 'run',
            attacking: 'attack_slash',
            hurt: 'hurt',
            victory: 'victory',
            jumping: 'idle',     // 跳跃使用idle，但有垂直偏移
            crouching: 'idle',   // 下蹲使用idle，但有垂直偏移
            rolling: 'run',      // 翻滚使用run（如果没有专用翻滚动画）
            charging: 'idle'     // 蓄力使用idle
        };
    }

    // 检查精灵动画是否可用
    checkSpriteAvailability() {
        // 检查关键动作是否已加载（idle, run, attack_slash, victory）
        const requiredActions = ['idle', 'run', 'attack_slash', 'victory'];
        const loadedActions = requiredActions.filter(action => spriteAnimation.isLoaded(action));

        // 如果至少有idle和victory，就启用精灵动画
        if (loadedActions.length >= 2) {
            this.useSpriteAnimation = true;
            return true;
        }

        // 否则禁用精灵动画
        this.useSpriteAnimation = false;
        return false;
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

        // 计算绘制位置
        let drawX = this.x;
        let drawY = this.y;
        let drawWidth = this.width;
        let drawHeight = this.height;

        // 状态调整：跳跃、下蹲、受伤时的位置偏移
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

        // 胜利特效（在精灵图下方绘制）
        if (this.isVictory) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffd93d';

            // 胜利光环
            const radius = 20 + (this.victoryFrame || 0) * 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + 30, radius, 0, Math.PI * 2);
            ctx.stroke();

            // 胜利星星
            const starX = this.x + this.width/2 + ((this.victoryFrame || 0) % 2 === 0 ? 15 : -15);
            const starY = this.y - 10;
            ctx.fillStyle = '#ffd93d';
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

        // 精灵图绘制
        const hasCurrentActionSprite = spriteAnimation.isLoaded(this.currentAction);
        let spriteDrawn = false;

        if (hasCurrentActionSprite) {
            spriteDrawn = spriteAnimation.draw(
                ctx,
                this.currentAction,
                drawX,
                drawY,
                drawWidth,
                drawHeight,
                this.currentFrame
            );
        }

        // 如果当前动作没有精灵图，或者绘制失败，回退到程序化绘制
        if (!spriteDrawn) {
            super.draw(ctx);
        }

        // 绘制额外特效（在精灵图之上）
        this.drawExtraEffects(ctx);

        // 血条和体力条
        this.drawBars(ctx, drawY);

        // 武器图标
        if (this.weapon && !this.isAttacking && this.attackFrame === 0) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.weapon.emoji, this.x + this.width/2, drawY - 15);
        }

        // 翻滚特效（额外视觉效果）
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
        }

        // 蓄力特效（额外视觉效果）
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

        // 更新精灵动画（包括胜利动画）
        this.updateAnimation(deltaTime);
    }

    // 重写胜利动画更新，支持精灵动画
    updateVictoryAnimation() {
        if (this.isVictory) {
            this.victoryTimer++;
            this.victoryFrame = Math.floor(this.victoryTimer / 5) % 4;

            // 如果使用精灵动画，确保当前动作是victory
            if (this.useSpriteAnimation && this.currentAction !== 'victory') {
                this.currentAction = 'victory';
                this.currentFrame = 0;
                this.animationTimer = 0;
            }

            // 更新精灵动画帧（如果使用精灵）
            if (this.useSpriteAnimation) {
                this.animationTimer += 16; // 假设60fps
                while (this.animationTimer >= this.frameDuration) {
                    this.animationTimer -= this.frameDuration;
                    this.currentFrame++;
                    const frameCount = spriteAnimation.getFrameCount('victory');
                    if (frameCount > 0 && this.currentFrame >= frameCount) {
                        this.currentFrame = 0; // 循环
                    }
                }
            }
        }
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

    // 设置胜利动画
    setVictoryAnimation() {
        this.isVictory = true;
        this.currentAction = 'victory';
        this.currentFrame = 0;
        this.animationTimer = 0;
        const fps = spriteAnimation.getFPS('victory') || 12;
        this.frameDuration = 1000 / fps;
    }
}
