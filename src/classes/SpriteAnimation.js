// 精灵动画管理器 - 负责加载和播放精灵表动画
export class SpriteAnimation {
    constructor() {
        this.spriteSheets = {}; // 存储所有精灵表
        this.loaded = false;
        this.metadata = {}; // 存储JSON元数据
    }

    // 加载单个精灵表
    async loadSpriteSheet(action, imagePath, jsonPath) {
        try {
            // 加载图片
            const img = new Image();
            img.src = imagePath;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            // 加载元数据
            let metadata;
            if (jsonPath) {
                const response = await fetch(jsonPath);
                metadata = await response.json();
            } else {
                // 如果没有JSON文件，尝试从图片推断
                metadata = this.inferMetadata(action, img);
            }

            this.spriteSheets[action] = {
                image: img,
                metadata: metadata
            };

            console.log(`✅ 精灵表加载成功: ${action}`);
            return true;
        } catch (error) {
            console.warn(`⚠️ 精灵表加载失败: ${action}`, error);
            return false;
        }
    }

    // 从图片推断元数据（备用方案）
    inferMetadata(action, img) {
        const frameWidth = 64; // 默认假设
        const frameHeight = 64;
        const frameCount = img.width / frameWidth;

        // 根据动作类型设置默认帧数
        const defaultFrames = {
            'idle': 12,
            'walk': 8,
            'run': 6,
            'attack_slash': 6,
            'hurt': 3,
            'victory': 8
        };

        return {
            action: action,
            frameCount: defaultFrames[action] || frameCount,
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            sheetWidth: img.width,
            sheetHeight: img.height,
            fps: 12
        };
    }

    // 批量加载所有精灵表
    async loadAllSprites(basePath = '/sprites/') {
        const actions = ['idle', 'walk', 'run', 'attack_slash', 'hurt', 'victory'];
        const loadPromises = actions.map(action => {
            const imagePath = `${basePath}${action}_sprite.png`;
            const jsonPath = `${basePath}${action}_sprite.json`;
            return this.loadSpriteSheet(action, imagePath, jsonPath);
        });

        const results = await Promise.all(loadPromises);
        const successCount = results.filter(r => r).length;

        this.loaded = successCount === actions.length;

        if (this.loaded) {
            console.log(`🎉 所有精灵表加载完成: ${successCount}/${actions.length}`);
        } else {
            console.warn(`⚠️ 部分精灵表加载失败: ${successCount}/${actions.length}`);
        }

        return this.loaded;
    }

    // 绘制指定动作的当前帧
    draw(ctx, action, x, y, width, height, frameIndex) {
        const sprite = this.spriteSheets[action];
        if (!sprite) {
            // 如果没有精灵图，返回false让调用者使用程序化绘制
            return false;
        }

        const { image, metadata } = sprite;
        const { frameWidth, frameHeight, frameCount } = metadata;

        // 确保帧索引在范围内
        const currentFrame = frameIndex % frameCount;
        const sx = currentFrame * frameWidth;

        // 绘制精灵
        ctx.drawImage(
            image,
            sx, 0, frameWidth, frameHeight, // 源区域
            x, y, width, height            // 目标区域
        );

        return true;
    }

    // 获取动作的元数据
    getMetadata(action) {
        return this.spriteSheets[action]?.metadata;
    }

    // 检查是否已加载特定动作
    isLoaded(action) {
        return !!this.spriteSheets[action];
    }

    // 检查是否所有动作都已加载
    isAllLoaded() {
        const requiredActions = ['idle', 'walk', 'run', 'attack_slash', 'hurt', 'victory'];
        return requiredActions.every(action => this.isLoaded(action));
    }

    // 获取动作的总帧数
    getFrameCount(action) {
        const metadata = this.getMetadata(action);
        return metadata ? metadata.frameCount : 0;
    }

    // 获取动作的FPS
    getFPS(action) {
        const metadata = this.getMetadata(action);
        return metadata ? metadata.fps : 12;
    }
}

// 全局精灵动画实例
export const spriteAnimation = new SpriteAnimation();
