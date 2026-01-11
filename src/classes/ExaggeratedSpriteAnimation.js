// 夸张火柴人精灵动画管理器
// 支持动态缩放和夸张的视觉效果

export class ExaggeratedSpriteAnimation {
    constructor() {
        this.spriteSheets = {};
        this.loaded = false;
        this.metadata = {};

        // 动画增强配置
        this.enhancement = {
            scale: 1.2,           // 整体放大
            shake: 0.5,           // 动作震动强度
            trail: 2,             // 拖影帧数
            impact: 1.5           // 冲击感倍数
        };
    }

    // 加载精灵表
    async loadSpriteSheet(action, imagePath, jsonPath) {
        try {
            const img = new Image();
            img.src = imagePath;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            let metadata;
            if (jsonPath) {
                const response = await fetch(jsonPath);
                metadata = await response.json();
            } else {
                metadata = this.inferMetadata(action, img);
            }

            this.spriteSheets[action] = { image: img, metadata };
            console.log(`✅ 夸张精灵表加载: ${action} (${metadata.frameCount}帧 @ ${metadata.fps}FPS)`);
            return true;
        } catch (error) {
            console.warn(`⚠️ 加载失败: ${action}`, error);
            return false;
        }
    }

    inferMetadata(action, img) {
        const defaultFPS = {
            'idle': 10, 'walk': 12, 'run': 15,
            'attack_slash': 12, 'hurt': 15, 'victory': 10
        };

        const frameWidth = 128;
        const frameCount = img.width / frameWidth;

        return {
            action,
            frameCount: Math.floor(frameCount),
            frameWidth: 128,
            frameHeight: 128,
            sheetWidth: img.width,
            sheetHeight: img.height,
            fps: defaultFPS[action] || 12
        };
    }

    // 批量加载
    async loadAllSprites(basePath = '/sprites/') {
        const actions = ['idle', 'walk', 'run', 'attack_slash', 'hurt', 'victory'];
        const results = await Promise.all(
            actions.map(action =>
                this.loadSpriteSheet(
                    action,
                    `${basePath}${action}_sprite.png`,
                    `${basePath}${action}_sprite.json`
                )
            )
        );

        this.loaded = results.every(r => r);
        return this.loaded;
    }

    // 绘制增强版精灵
    draw(ctx, action, x, y, width, height, frameIndex, gameState = {}) {
        const sprite = this.spriteSheets[action];
        if (!sprite) return false;

        const { image, metadata } = sprite;
        const { frameWidth, frameHeight, frameCount } = metadata;

        // 当前帧
        const currentFrame = frameIndex % frameCount;
        const sx = currentFrame * frameWidth;

        // 增强效果：基于游戏状态的动态调整
        let offsetX = 0, offsetY = 0, scale = 1.0, alpha = 1.0;

        // 根据动作类型添加夸张效果
        switch (action) {
            case 'run':
                // 奔跑时的震动
                if (gameState.vx) {
                    offsetX = (Math.random() - 0.5) * this.enhancement.shake * 2;
                }
                break;

            case 'attack_slash':
                // 攻击时的冲击感
                if (gameState.isAttacking) {
                    scale = this.enhancement.impact;
                    offsetX = (gameState.direction || 1) * 3;
                }
                break;

            case 'hurt':
                // 受伤时的闪烁
                if (gameState.hitFlashTimer > 0) {
                    alpha = 0.5 + (gameState.hitFlashTimer % 2) * 0.5;
                }
                break;

            case 'victory':
                // 胜利时的放大
                scale = 1.1 + Math.sin(gameState.victoryFrame * 0.5) * 0.1;
                break;
        }

        // 应用增强
        ctx.save();
        ctx.globalAlpha = alpha;

        // 计算绘制区域（保持比例，居中）
        const targetWidth = width * scale * this.enhancement.scale;
        const targetHeight = height * scale * this.enhancement.scale;

        // 居中偏移
        const drawX = x + (width - targetWidth) / 2 + offsetX;
        const drawY = y + (height - targetHeight) / 2 + offsetY;

        // 绘制精灵
        ctx.drawImage(
            image,
            sx, 0, frameWidth, frameHeight,
            drawX, drawY, targetWidth, targetHeight
        );

        // 拖影效果（高速动作）
        if (this.enhancement.trail > 0 && (action === 'run' || action === 'attack_slash')) {
            const trailAlpha = 0.2;
            const trailOffset = 3;

            ctx.globalAlpha = trailAlpha;
            ctx.drawImage(
                image,
                sx, 0, frameWidth, frameHeight,
                drawX - trailOffset, drawY, targetWidth, targetHeight
            );
        }

        ctx.restore();

        return true;
    }

    // 获取动作信息
    getMetadata(action) {
        return this.spriteSheets[action]?.metadata;
    }

    isLoaded(action) {
        return !!this.spriteSheets[action];
    }

    isAllLoaded() {
        const required = ['idle', 'walk', 'run', 'attack_slash', 'hurt', 'victory'];
        return required.every(a => this.isLoaded(a));
    }

    getFrameCount(action) {
        return this.getMetadata(action)?.frameCount || 0;
    }

    getFPS(action) {
        return this.getMetadata(action)?.fps || 12;
    }

    // 设置增强参数
    setEnhancement(key, value) {
        if (this.enhancement.hasOwnProperty(key)) {
            this.enhancement[key] = value;
        }
    }
}

// 全局实例
export const exaggeratedSpriteAnimation = new ExaggeratedSpriteAnimation();
