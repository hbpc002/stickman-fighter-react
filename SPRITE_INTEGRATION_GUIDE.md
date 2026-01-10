# 精灵动画集成指南

## 🎯 概述

当前火柴人游戏使用**程序化绘制**（Canvas API画线）。本指南说明如何集成精灵动画系统，实现平滑的帧动画效果。

## 📁 文件结构

```
src/
├── classes/
│   ├── SpriteAnimation.js      # 精灵动画管理器
│   └── SpriteStickman.js       # 精灵版Stickman类
├── hooks/
│   └── useSpriteLoader.js      # 精灵图加载Hook
└── public/
    └── sprites/                # 生成的精灵表
        ├── idle_sprite.png
        ├── idle_sprite.json
        └── ...
```

## 🚀 快速集成（3步）

### 步骤1: 生成精灵表
```bash
./create_spritesheets.sh generate
```

### 步骤2: 修改App.jsx

```javascript
// 1. 导入新类
import { SpriteStickman } from './classes/SpriteStickman.js';
import { useSpriteLoader } from './hooks/useSpriteLoader.js';

// 2. 在App组件中添加精灵加载
export default function App() {
    const { loading, loaded, progress, error } = useSpriteLoader();

    // 3. 修改游戏初始化
    const initGame = useCallback(() => {
        // ... 现有代码 ...

        // 使用SpriteStickman替代Stickman
        gameRef.current.player1 = new SpriteStickman(
            100, groundLevel - 60, '#ff4444',
            { left: 'a', right: 'd', jump: 'w', attack: 'f', block: 's' },
            1, width, height
        );

        gameRef.current.player2 = new SpriteStickman(
            width - 130, groundLevel - 60, '#4444ff',
            { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', attack: 'j', block: 'arrowdown' },
            2, width, height
        );

        // ... 其余代码 ...
    }, []);

    // 4. 添加加载状态显示
    if (loading) {
        return <div>加载精灵图中... {progress}%</div>;
    }

    if (error) {
        console.warn(error); // 会自动回退到程序化绘制
    }

    // ... 原有渲染 ...
}
```

### 步骤3: 修改update循环

```javascript
// 在游戏循环中传递deltaTime
const gameLoop = useCallback((timestamp) => {
    if (!gameRef.current.animationFrame) return;

    const deltaTime = timestamp - (lastTimestampRef.current || timestamp);
    lastTimestampRef.current = timestamp;

    const { player1, player2 } = gameRef.current;

    // 传递deltaTime
    player1.update(keys, player2, deltaTime);
    player2.update(keys, player1, deltaTime);

    // ... 其余逻辑 ...
}, []);
```

## 🔧 工作原理

### 1. 自动回退机制
```javascript
// SpriteStickman.draw() 会自动检测
if (this.useSpriteAnimation) {
    // 使用精灵图
    spriteAnimation.draw(ctx, action, x, y, w, h, frame);
} else {
    // 回退到程序化绘制
    super.draw(ctx);
}
```

### 2. 动作映射
```javascript
this.actionMap = {
    idle: 'idle',           // 待机
    walking: 'walk',        // 行走
    running: 'run',         // 奔跑
    attacking: 'attack_slash', // 攻击
    hurt: 'hurt',           // 受伤
    victory: 'victory',     // 胜利
    jumping: 'idle',        // 跳跃（使用idle但有位置偏移）
    crouching: 'idle',      // 下蹲
    rolling: 'run',         // 翻滚
    charging: 'idle'        // 蓄力
};
```

### 3. 帧动画更新
```javascript
updateAnimation(deltaTime) {
    this.animationTimer += deltaTime;

    while (this.animationTimer >= this.frameDuration) {
        this.animationTimer -= this.frameDuration;
        this.currentFrame++;

        // 循环或停止
        if (this.currentFrame >= frameCount) {
            if (oneShotAction) {
                this.currentFrame = frameCount - 1; // 停在最后一帧
            } else {
                this.currentFrame = 0; // 循环
            }
        }
    }
}
```

## 🎨 动画效果对比

### 程序化绘制（当前）
- ✅ 无需额外资源
- ✅ 无限缩放
- ❌ 动作简单
- ❌ 缺乏细节

### 精灵动画（新）
- ✅ 平滑流畅
- ✅ 细节丰富
- ✅ 专业感强
- ❌ 需要PNG资源
- ❌ 固定分辨率

## 📊 性能考虑

### 内存使用
- 每个精灵表：~100-500KB（取决于分辨率）
- 6个动作：~1-3MB总内存

### 渲染性能
- 精灵图：更快（GPU优化）
- 程序化：稍慢（CPU计算）

### 兼容性
- 自动检测并回退
- 无资源时使用程序化绘制

## 🔍 调试信息

### 检查精灵状态
```javascript
// 在控制台查看
console.log(player1.getAnimationInfo());
// 输出: {action: "walk", frame: 3, timer: 120, duration: 83, useSprites: true}
```

### 强制使用程序化
```javascript
// 在SpriteStickman构造函数中
this.useSpriteAnimation = false; // 强制回退
```

## 🛠️ 自定义动画

### 添加新动作
1. 在`create_spritesheets.sh`中添加：
```bash
ACTIONS["dance"]="10"
```

2. 创建文件夹：
```bash
mkdir -p sprite_assets/dance
```

3. 更新动作映射：
```javascript
this.actionMap.dancing = 'dance';
```

### 调整FPS
```javascript
// 在SpriteAnimation.js的inferMetadata中
return {
    // ...
    fps: 15, // 自定义FPS
};
```

## 📝 完整示例代码

### 完整的App.jsx修改
```javascript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SpriteStickman } from './classes/SpriteStickman.js';
import { useSpriteLoader } from './hooks/useSpriteLoader.js';

export default function App() {
    const canvasRef = useRef(null);
    const { loading, loaded, progress, error } = useSpriteLoader();

    // ... 其余状态 ...

    const initGame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;

        const resizeHandler = () => {
            if (!container) return;
            const { width, height } = resizeCanvas(canvas, container);
            gameRef.current.canvasWidth = width;
            gameRef.current.canvasHeight = height;

            // 使用SpriteStickman
            const groundLevel = height - 80;

            gameRef.current.player1 = new SpriteStickman(
                100, groundLevel - 60, '#ff4444',
                { left: 'a', right: 'd', jump: 'w', attack: 'f', block: 's' },
                1, width, height
            );

            gameRef.current.player2 = new SpriteStickman(
                width - 130, groundLevel - 60, '#4444ff',
                { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', attack: 'j', block: 'arrowdown' },
                2, width, height
            );
        };

        resizeHandler();
        window.addEventListener('resize', resizeHandler);

        return () => window.removeEventListener('resize', resizeHandler);
    }, []);

    // 游戏循环 - 添加deltaTime
    const gameLoop = useCallback((timestamp) => {
        if (!gameRef.current.animationFrame) return;

        const deltaTime = timestamp - (lastTimestampRef.current || timestamp);
        lastTimestampRef.current = timestamp;

        const { player1, player2, weapons, particles } = gameRef.current;

        if (player1 && player2 && !gameState.paused && !gameState.gameOver) {
            // 更新玩家 - 传递deltaTime
            player1.update(keys, player2, deltaTime);
            player2.update(keys, player1, deltaTime);

            // ... 其余游戏逻辑 ...
        }

        // 渲染
        render();

        gameRef.current.animationFrame = requestAnimationFrame(gameLoop);
    }, [keys, gameState]);

    // 渲染函数
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 绘制背景
        drawBackground(ctx, width, height);

        // 绘制玩家
        const { player1, player2, weapons, damageTexts, particles } = gameRef.current;

        if (player1) player1.draw(ctx);
        if (player2) player2.draw(ctx);

        // ... 其余绘制逻辑 ...
    }, []);

    // 加载状态UI
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <h2>加载精灵图资源中...</h2>
                <div style={{
                    width: '300px',
                    height: '20px',
                    background: '#333',
                    borderRadius: '10px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: '#4CAF50',
                        transition: 'width 0.3s'
                    }}></div>
                </div>
                <p>{progress}%</p>
            </div>
        );
    }

    if (error) {
        console.warn('精灵图加载失败，使用程序化绘制:', error);
    }

    // ... 原有渲染 ...
}
```

## 🎯 验证集成

### 测试步骤
1. 运行游戏
2. 按F12打开控制台
3. 检查是否显示"精灵图加载成功"
4. 观察玩家动作是否流畅

### 预期结果
- ✅ 精灵图加载：显示进度条
- ✅ 加载成功：流畅动画
- ✅ 加载失败：自动回退程序化绘制
- ✅ 无资源：正常游戏

## 📦 依赖说明

### 已创建文件
- `src/classes/SpriteAnimation.js` - 核心管理器
- `src/classes/SpriteStickman.js` - 精灵版玩家
- `src/hooks/useSpriteLoader.js` - React集成
- `create_spritesheets.sh` - 生成工具
- `SPRITE_GENERATION_GUIDE.md` - 生成指南

### 需要的资源
- `public/sprites/*.png` - 精灵表（由脚本生成）
- `public/sprites/*.json` - 元数据（由脚本生成）

## 🔧 故障排除

### 问题1: 精灵图不显示
**检查：**
1. 文件是否在`public/sprites/`目录
2. 文件名是否正确（`idle_sprite.png`）
3. 控制台是否有404错误

### 问题2: 动画卡顿
**检查：**
1. deltaTime是否正确传递
2. FPS设置是否合适
3. 浏览器性能

### 问题3: 内存泄漏
**检查：**
1. 是否重复加载
2. 图片缓存是否正确

---

**版本：** 1.0
**更新日期：** 2026-01-10
**兼容性：** React 18+, Canvas API
