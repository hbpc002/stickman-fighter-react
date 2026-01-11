import React, { useState, useEffect, useRef, useCallback } from 'react';

// 导入模块化类
import { WEAPON_TYPES, Weapon } from './classes/Weapons.js';
import {
    DamageText, Particle, FlyingWeapon, WeaponTrail, Shockwave,
    PoisonCloud, LightningBolt, LaserTrail, ComboEffect, SpecialAttackEffect
} from './classes/VisualEffects.js';
import { Stickman } from './classes/Stickman.js';
import { SpriteStickman } from './classes/SpriteStickman.js';

// 导入自定义Hooks
import { useGameAudio } from './hooks/useGameAudio.js';
import { useDeviceDetection } from './hooks/useDeviceDetection.js';
import { useSpriteLoader } from './hooks/useSpriteLoader.js';

// 导入工具函数
import { resizeCanvas, drawBackground, drawWeapons, drawEffects, handleWeaponPickup } from './utils/gameUtils.js';

// Main App Component
export default function App() {
    const canvasRef = useRef(null);
    const { soundEnabled, toggleSound } = useGameAudio();
    const { isMobile, showPortraitWarning } = useDeviceDetection();

    // 精灵加载状态
    const { loading, loaded, progress, error, spriteStatus } = useSpriteLoader();

    const [gameState, setGameState] = useState({
        gameOver: false,
        paused: false,
        winner: null,
        aiEnabled: false,
        hardcoreMode: false,
        isMobile: false,
        showPortraitWarning: false,
        gameStarted: false,
        victoryAnimation: false
    });

    const [keys, setKeys] = useState({});
    const [notification, setNotification] = useState({ show: false, message: '', duration: 1500 });
    const [combo, setCombo] = useState({ show: false, text: '' });
    const [weaponStatus, setWeaponStatus] = useState({ show: false, text: '' });
    const [modeIndicator, setModeIndicator] = useState({ show: false, text: '' });
    const [showHelp, setShowHelp] = useState(false);
    const [survivalMode, setSurvivalMode] = useState(false);

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
        poisonClouds: [],
        lightningBolts: [],
        laserTrails: [],
        stats: {
            p1: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 },
            p2: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 }
        },
        animationFrame: null,
        canvasWidth: 800,
        canvasHeight: 500,
        lastTime: 0
    });

    // 键盘事件处理
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

    // 触摸/滑动手势处理 - 屏幕分为左右两半，每半控制一个玩家
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const touchState = {
            p1: { startX: 0, startY: 0, startTime: 0, active: false },
            p2: { startX: 0, startY: 0, startTime: 0, active: false }
        };

        const SWIPE_THRESHOLD = 30; // 最小滑动距离
        const TAP_THRESHOLD = 150; // 最大点击时间（毫秒）

        const handleTouchStart = (e) => {
            e.preventDefault();
            const touches = e.touches;

            for (let i = 0; i < touches.length; i++) {
                const touch = touches[i];
                const canvasRect = canvas.getBoundingClientRect();
                const x = touch.clientX - canvasRect.left;
                const canvasWidth = canvasRect.width;

                // 屏幕左右分半：左半屏控制玩家1，右半屏控制玩家2
                if (x < canvasWidth / 2) {
                    touchState.p1 = {
                        startX: touch.clientX,
                        startY: touch.clientY,
                        startTime: Date.now(),
                        active: true,
                        id: touch.identifier
                    };
                } else {
                    touchState.p2 = {
                        startX: touch.clientX,
                        startY: touch.clientY,
                        startTime: Date.now(),
                        active: true,
                        id: touch.identifier
                    };
                }
            }
        };

        const handleTouchMove = (e) => {
            e.preventDefault();
            // 滑动过程中不需要实时处理，等待touchend
        };

        const handleTouchEnd = (e) => {
            e.preventDefault();
            const changedTouches = e.changedTouches;

            for (let i = 0; i < changedTouches.length; i++) {
                const touch = changedTouches[i];
                const canvasRect = canvas.getBoundingClientRect();
                const x = touch.clientX - canvasRect.left;
                const y = touch.clientY - canvasRect.top;
                const canvasWidth = canvasRect.width;
                const canvasHeight = canvasRect.height;

                // 确定是哪个玩家
                let player;
                if (x < canvasWidth / 2) {
                    player = touchState.p1;
                    if (player.id !== touch.identifier) continue;
                    player.active = false;

                    // 计算滑动向量
                    const dx = touch.clientX - player.startX;
                    const dy = touch.clientY - player.startY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const duration = Date.now() - player.startTime;

                    // 判断是滑动还是点击
                    if (distance > SWIPE_THRESHOLD && duration < 1000) {
                        // 滑动操作
                        if (Math.abs(dx) > Math.abs(dy)) {
                            // 水平滑动 - 移动
                            if (dx > 0) {
                                // 向右 - 玩家1向右
                                setKeys(prev => ({ ...prev, 'd': true }));
                                setTimeout(() => setKeys(prev => ({ ...prev, 'd': false })), 200);
                            } else {
                                // 向左 - 玩家1向左
                                setKeys(prev => ({ ...prev, 'a': true }));
                                setTimeout(() => setKeys(prev => ({ ...prev, 'a': false })), 200);
                            }
                        } else {
                            // 垂直滑动 - 跳跃或防御
                            if (dy < 0) {
                                // 向上滑 - 跳跃
                                setKeys(prev => ({ ...prev, 'w': true }));
                                setTimeout(() => setKeys(prev => ({ ...prev, 'w': false })), 200);
                            } else {
                                // 向下滑 - 防御
                                setKeys(prev => ({ ...prev, 's': true }));
                                setTimeout(() => setKeys(prev => ({ ...prev, 's': false })), 300);
                            }
                        }
                    } else if (duration < TAP_THRESHOLD) {
                        // 点击操作 - 攻击
                        // 检查是否点击在屏幕下半部分（防御区）还是上半部分（攻击区）
                        if (y > canvasHeight / 2) {
                            // 下半部分 - 防御
                            setKeys(prev => ({ ...prev, 's': true }));
                            setTimeout(() => setKeys(prev => ({ ...prev, 's': false })), 300);
                        } else {
                            // 上半部分 - 攻击
                            setKeys(prev => ({ ...prev, ' ': true }));
                            setTimeout(() => setKeys(prev => ({ ...prev, ' ': false })), 150);
                        }
                    }
                } else {
                    player = touchState.p2;
                    if (player.id !== touch.identifier) continue;
                    player.active = false;

                    // 计算滑动向量
                    const dx = touch.clientX - player.startX;
                    const dy = touch.clientY - player.startY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const duration = Date.now() - player.startTime;

                    // 判断是滑动还是点击
                    if (distance > SWIPE_THRESHOLD && duration < 1000) {
                        // 滑动操作
                        if (Math.abs(dx) > Math.abs(dy)) {
                            // 水平滑动 - 移动
                            if (dx > 0) {
                                // 向右 - 玩家2向右
                                setKeys(prev => ({ ...prev, 'arrowright': true }));
                                setTimeout(() => setKeys(prev => ({ ...prev, 'arrowright': false })), 200);
                            } else {
                                // 向左 - 玩家2向左
                                setKeys(prev => ({ ...prev, 'arrowleft': true }));
                                setTimeout(() => setKeys(prev => ({ ...prev, 'arrowleft': false })), 200);
                            }
                        } else {
                            // 垂直滑动 - 跳跃或防御
                            if (dy < 0) {
                                // 向上滑 - 跳跃
                                setKeys(prev => ({ ...prev, 'arrowup': true }));
                                setTimeout(() => setKeys(prev => ({ ...prev, 'arrowup': false })), 200);
                            } else {
                                // 向下滑 - 防御
                                setKeys(prev => ({ ...prev, 'k': true }));
                                setTimeout(() => setKeys(prev => ({ ...prev, 'k': false })), 300);
                            }
                        }
                    } else if (duration < TAP_THRESHOLD) {
                        // 点击操作 - 攻击
                        // 检查是否点击在屏幕下半部分（防御区）还是上半部分（攻击区）
                        if (y > canvasHeight / 2) {
                            // 下半部分 - 防御
                            setKeys(prev => ({ ...prev, 'k': true }));
                            setTimeout(() => setKeys(prev => ({ ...prev, 'k': false })), 300);
                        } else {
                            // 上半部分 - 攻击
                            setKeys(prev => ({ ...prev, 'j': true }));
                            setTimeout(() => setKeys(prev => ({ ...prev, 'j': false })), 150);
                        }
                    }
                }
            }
        };

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    // 游戏初始化
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
        };

        resizeHandler();
        window.addEventListener('resize', resizeHandler);

        // 检查精灵是否已加载，决定使用 SpriteStickman 还是 Stickman
        const useSprites = loaded;
        const StickmanClass = useSprites ? SpriteStickman : Stickman;

        if (useSprites) {
            showNotification('✅ 精灵动画已加载!', 1500);
        } else {
            showNotification('⚠️ 使用程序化绘制 (精灵未加载)', 1500);
        }

        // 初始化玩家
        gameRef.current.player1 = new StickmanClass(
            150, 0, '#ff6b6b',
            { left: 'a', right: 'd', jump: 'w', attack: ' ', block: 's' },
            1,
            gameRef.current.canvasWidth,
            gameRef.current.canvasHeight
        );

        gameRef.current.player2 = new StickmanClass(
            620, 0, '#4dabf7',
            { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', attack: 'j', block: 'k' },
            2,
            gameRef.current.canvasWidth,
            gameRef.current.canvasHeight
        );

        const groundLevel = gameRef.current.canvasHeight - 80;
        gameRef.current.player1.y = groundLevel - gameRef.current.player1.height;
        gameRef.current.player2.y = groundLevel - gameRef.current.player2.height;

        // 如果使用精灵动画，启用精灵动画模式
        if (useSprites && gameRef.current.player1.checkSpriteAvailability) {
            gameRef.current.player1.checkSpriteAvailability();
            gameRef.current.player2.checkSpriteAvailability();
        }

        setGameState(prev => ({
            ...prev,
            gameOver: false,
            paused: false,
            winner: null
        }));

        // 重置所有数组
        gameRef.current.weapons = [];
        gameRef.current.damageTexts = [];
        gameRef.current.particles = [];
        gameRef.current.flyingWeapons = [];
        gameRef.current.weaponTrails = [];
        gameRef.current.shockwaves = [];
        gameRef.current.poisonClouds = [];
        gameRef.current.lightningBolts = [];
        gameRef.current.laserTrails = [];
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
        window.poisonClouds = gameRef.current.poisonClouds;
        window.lightningBolts = gameRef.current.lightningBolts;
        window.laserTrails = gameRef.current.laserTrails;

        showNotification('🔥 战斗开始！', 1500);

        return () => {
            window.removeEventListener('resize', resizeHandler);
        };
    }, [loaded]);

    // 游戏主循环
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gameRef.current.player1 || !gameRef.current.player2) return;

        const ctx = canvas.getContext('2d');
        const p1 = gameRef.current.player1;
        const p2 = gameRef.current.player2;

        // 计算deltaTime
        const currentTime = Date.now();
        const deltaTime = gameRef.current.lastTime ? currentTime - gameRef.current.lastTime : 16;
        gameRef.current.lastTime = currentTime;

        ctx.clearRect(0, 0, gameRef.current.canvasWidth, gameRef.current.canvasHeight);

        // 绘制背景
        drawBackground(ctx, gameRef.current.canvasWidth, gameRef.current.canvasHeight);

        if (!gameState.paused && !gameState.gameOver) {
            // 武器更新和掉落
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

            // 武器拾取
            handleWeaponPickup(p1, gameRef.current.weapons, gameRef.current.stats.p1, showNotification);
            handleWeaponPickup(p2, gameRef.current.weapons, gameRef.current.stats.p2, showNotification);
        }

        // 绘制武器
        drawWeapons(ctx, gameRef.current.weapons);

        if (!gameState.paused && !gameState.gameOver) {
            // 如果正在进行胜利动画，只更新动画不进行正常游戏逻辑
            if (gameState.victoryAnimation) {
                // 胜利动画模式：只更新动画，不进行碰撞检测等
                // 对于SpriteStickman，需要调用updateVictoryAnimation来更新精灵帧
                // 对于Stickman，updateVictoryAnimation会处理程序化动画更新
                if (p1.updateVictoryAnimation) p1.updateVictoryAnimation();
                if (p2.updateVictoryAnimation) p2.updateVictoryAnimation();
            } else {
                // 正常游戏模式
                // 更新玩家（传递deltaTime给SpriteStickman）
                if (p1.update.length >= 3) {
                    p1.update(keys, p2, deltaTime);
                } else {
                    p1.update(keys, p2);
                }

                if (p2.update.length >= 3) {
                    p2.update(keys, p1, deltaTime);
                } else {
                    p2.update(keys, p1);
                }

                // 统计
                if (p1.weapon && p1.weapon.durability < p1.weapon.maxDurability) {
                    gameRef.current.stats.p1.damage += p1.weapon.baseDamage;
                }
                if (p2.weapon && p2.weapon.durability < p2.weapon.maxDurability) {
                    gameRef.current.stats.p2.damage += p2.weapon.baseDamage;
                }

                // 游戏结束检测（含生存模式）
                if (p1.hp <= 0 || p2.hp <= 0) {
                    if (survivalMode && p2.hp <= 0) {
                        // 生存模式：AI复活并增强
                        const groundLevel = gameRef.current.canvasHeight - 80;
                        const StickmanClass = loaded ? SpriteStickman : Stickman;
                        gameRef.current.player2 = new StickmanClass(
                            620, 0, '#4dabf7',
                            { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', attack: 'j', block: 'k' },
                            2,
                            gameRef.current.canvasWidth,
                            gameRef.current.canvasHeight
                        );
                        gameRef.current.player2.y = groundLevel - gameRef.current.player2.height;
                        gameRef.current.player2.aiEnabled = true;
                        gameRef.current.player2.attackDamage += 2;
                        gameRef.current.player2.maxHp += 10;
                        gameRef.current.player2.hp = gameRef.current.player2.maxHp;
                        if (loaded && gameRef.current.player2.checkSpriteAvailability) {
                            gameRef.current.player2.checkSpriteAvailability();
                        }
                        showNotification('💀 AI复活! 强度提升!', 1500);
                    } else if (!gameState.victoryAnimation) {
                        // 只在第一次检测到胜利时执行
                        const winner = p1.hp > 0 ? '玩家1' : '玩家2';
                        const winningPlayer = p1.hp > 0 ? p1 : p2;

                        // 设置胜利状态和动画标志
                        setGameState(prev => ({
                            ...prev,
                            winner: winner,
                            victoryAnimation: true
                        }));

                        // 设置胜利玩家的动画状态
                        if (loaded && winningPlayer.setVictoryAnimation) {
                            winningPlayer.setVictoryAnimation();
                        } else if (winningPlayer.setVictoryAnimation) {
                            winningPlayer.setVictoryAnimation();
                        }

                        // 延迟2秒后显示游戏结束界面
                        setTimeout(() => {
                            setGameState(prev => ({
                                ...prev,
                                gameOver: true,
                                victoryAnimation: false
                            }));
                            showNotification(`🎉 ${winner} 获胜!`, 3000);
                        }, 2000);
                    }
                }
            }

            // 连击显示
            if (p1.combo > 1 || p2.combo > 1) {
                const maxCombo = Math.max(p1.combo, p2.combo);
                setCombo({ show: true, text: `${maxCombo} 连击!` });
            } else {
                setCombo({ show: false, text: '' });
            }

            // 武器状态显示
            if (p1.weapon || p2.weapon) {
                const status = [];
                if (p1.weapon) status.push(`🔵: ${p1.weapon.name}(${p1.weapon.durability})`);
                if (p2.weapon) status.push(`🔴: ${p2.weapon.name}(${p2.weapon.durability})`);
                setWeaponStatus({ show: true, text: status.join(' | ') });
            } else {
                setWeaponStatus({ show: false, text: '' });
            }
        }

        // 绘制玩家
        p1.draw(ctx);
        p2.draw(ctx);

        // 绘制特效
        drawEffects(ctx, {
            damageTexts: gameRef.current.damageTexts,
            particles: gameRef.current.particles,
            flyingWeapons: gameRef.current.flyingWeapons,
            weaponTrails: gameRef.current.weaponTrails,
            shockwaves: gameRef.current.shockwaves,
            poisonClouds: gameRef.current.poisonClouds,
            lightningBolts: gameRef.current.lightningBolts,
            laserTrails: gameRef.current.laserTrails
        });

        // 继续游戏循环：如果游戏未结束，或者正在进行胜利动画
        if (!gameState.gameOver || gameState.victoryAnimation) {
            gameRef.current.animationFrame = requestAnimationFrame(gameLoop);
        }
    }, [keys, gameState.paused, gameState.gameOver, gameState.victoryAnimation, survivalMode, loaded]);

    useEffect(() => {
        if ((!gameState.gameOver || gameState.victoryAnimation) && gameRef.current.player1 && gameRef.current.player2) {
            gameRef.current.animationFrame = requestAnimationFrame(gameLoop);
        }

        return () => {
            if (gameRef.current.animationFrame) {
                cancelAnimationFrame(gameRef.current.animationFrame);
            }
        };
    }, [gameLoop, gameState.gameOver, gameState.victoryAnimation]);

    // 通知系统
    const showNotification = (message, duration = 1500) => {
        setNotification({ show: true, message, duration });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, duration);
    };

    // 游戏控制处理
    const handleStart = async () => {
        // 自动全屏
        if (!document.fullscreenElement) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (err) {
                console.log('全屏失败:', err);
            }
        }

        // 设置游戏已开始状态
        setGameState(prev => ({ ...prev, gameStarted: true }));

        // 延迟一小段时间，让全屏生效后再初始化游戏
        setTimeout(() => {
            initGame();
        }, 100);
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

    const handleSurvival = () => {
        setSurvivalMode(prev => {
            const newSurvival = !prev;
            if (newSurvival) {
                showNotification('🎯 生存模式已开启!\\n击败无限AI对手', 2000);
                setModeIndicator({ show: true, text: '🎯 生存模式' });
                if (gameRef.current.player2 && !gameRef.current.player2.aiEnabled) {
                    gameRef.current.player2.aiEnabled = true;
                    setGameState(prevState => ({ ...prevState, aiEnabled: true }));
                }
            } else {
                showNotification('👋 生存模式已关闭', 1500);
                setModeIndicator({ show: gameState.hardcoreMode, text: gameState.hardcoreMode ? '💀 硬核模式' : '' });
            }
            return newSurvival;
        });
    };

    const handleReset = () => {
        if (gameRef.current.animationFrame) {
            cancelAnimationFrame(gameRef.current.animationFrame);
        }
        // 重置游戏状态，但保持gameStarted为true
        setGameState(prev => ({
            ...prev,
            gameOver: false,
            paused: false,
            winner: null
        }));
        initGame();
    };

    const handleWeapons = () => {
        showNotification(
            '⚔️ 创意武器系统说明 (1/3)\\n\\n' +
            '🔥 火焰剑 - 15伤害 + 燃烧\\n' +
            '⚡ 闪电锤 - 20伤害 + 击退\\n' +
            '🧊 冰霜弓 - 12伤害 + 减速\\n' +
            '💎 钻石匕首 - 25伤害 + 暴击\\n' +
            '🪓 战斧 - 22伤害 + 眩晕\\n' +
            '🎯 回旋镖 - 18伤害 + 特效\\n' +
            '⚔️ 圣剑 - 30伤害 + 光环\\n' +
            '🗡️ 毒匕首 - 8伤害 + 中毒\\n' +
            '🔨 雷神锤 - 28伤害 + 闪电\\n' +
            '✨ 光剑 - 16伤害 + 激光\\n\\n' +
            '🎯 机制：每5-10秒掉落\\n' +
            '🎯 靠近自动拾取\\n' +
            '🎯 F/J键使用武器\\n' +
            '🎯 武器有耐久度\\n' +
            '💡 顶部显示武器状态',
            5000
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

    // 触摸控制（备用，用于非Canvas区域）
    const handleTouchStart = (key) => {
        setKeys(prev => ({ ...prev, [key]: true }));
    };

    const handleTouchEnd = (key) => {
        setKeys(prev => ({ ...prev, [key]: false }));
    };

    return (
        <div className="main-container">
            {/* 开始界面 - 未开始游戏时显示 */}
            {!gameState.gameStarted && (
                <div className="start-screen">
                    <div className="start-content">
                        <h1 className="game-title">🔥 火柴人格斗 🔥</h1>
                        <p className="game-subtitle">双人对战 - 精灵动画版</p>
                        <button
                            className="start-button"
                            onClick={handleStart}
                        >
                            开始游戏
                        </button>
                        <div className="loading-hint">
                            点击开始按钮，将自动进入全屏模式
                        </div>
                    </div>
                </div>
            )}

            {/* 游戏内容 - 只在开始后显示 */}
            {gameState.gameStarted && (
                <>
                    {showPortraitWarning && (
                        <div className="portrait-warning show">
                            <div className="icon">📱</div>
                            <h2>请旋转设备</h2>
                            <p>建议使用横屏模式以获得最佳体验</p>
                        </div>
                    )}

                    {/* 精灵加载状态显示 */}
                    {loading && (
                        <div className="sprite-loading-overlay">
                            <div className="loading-content">
                                <div className="loading-spinner"></div>
                                <h3>加载精灵动画中...</h3>
                                <div className="loading-bar">
                                    <div className="loading-progress" style={{width: `${progress}%`}}></div>
                                </div>
                                <div className="loading-text">{progress}%</div>
                                <div className="sprite-status">
                                    {Object.entries(spriteStatus).map(([action, status]) => (
                                        <div key={action} className={`status-item ${status}`}>
                                            {action}: {status === 'loaded' ? '✅' : status === 'failed' ? '❌' : '⏳'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 精灵加载失败提示 */}
                    {error && !loading && (
                        <div className="notification show" style={{background: 'rgba(255, 100, 100, 0.9)'}}>
                            {error}
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
                            {/* 触摸提示 - 仅在移动端显示 */}
                            {isMobile && !gameState.gameOver && (
                                <div className="touch-hint">
                                    <div className="touch-hint-left">
                                        <div>👆 点击上半屏 - 攻击</div>
                                        <div>👇 点击下半屏 - 防御</div>
                                        <div>↔️ 左右滑动 - 移动</div>
                                        <div>⬆️ 向上滑 - 跳跃</div>
                                    </div>
                                    <div className="touch-hint-right">
                                        <div>👆 点击上半屏 - 攻击</div>
                                        <div>👇 点击下半屏 - 防御</div>
                                        <div>↔️ 左右滑动 - 移动</div>
                                        <div>⬆️ 向上滑 - 跳跃</div>
                                    </div>
                                </div>
                            )}

                            {/* 中心分割线 - 视觉指示 */}
                            {!gameState.gameOver && (
                                <div className="center-divider"></div>
                            )}

                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={500}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 50%, #90EE90 50%, #228B22 100%)',
                                    boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
                                    touchAction: 'none'
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
                            <button
                                className="func-btn warning"
                                onClick={handleSurvival}
                                style={survivalMode ? {background: 'rgba(255, 165, 0, 0.6)'} : {}}
                            >🎯 生存</button>
                            <button className="func-btn" onClick={handleReset}>🔄 重置</button>
                            <button className="func-btn" onClick={handleWeapons}>⚔️ 武器</button>
                            <button className="func-btn" onClick={() => setShowHelp(true)}>❓ 帮助</button>
                            <button className="func-btn" onClick={() => {
                                const newSoundState = toggleSound();
                                showNotification(newSoundState ? '🔊 音效开启' : '🔇 音效关闭', 1000);
                            }}>{soundEnabled ? '🔊' : '🔇'}</button>
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

                    {showHelp && (
                        <div className="game-over-overlay show" onClick={() => setShowHelp(false)}>
                            <div
                                className="winner-text"
                                style={{fontSize: '1.5em', cursor: 'pointer'}}
                                onClick={(e) => e.stopPropagation()}
                            >
                                🎮 游戏帮助<br/><br/>
                                <div style={{fontSize: '0.6em', textAlign: 'left', maxWidth: '600px', lineHeight: '1.6'}}>
                                    <strong>🎮 控制方式:</strong><br/>
                                    <strong>键盘:</strong> 玩家1 WASD + 空格/S | 玩家2 方向键 + J/K<br/>
                                    <strong>触屏滑动:</strong> 屏幕左右分半，每半控制一个玩家<br/>
                                    • 上半屏点击 = 攻击<br/>
                                    • 下半屏点击 = 防御<br/>
                                    • 左右滑动 = 移动<br/>
                                    • 向上滑动 = 跳跃<br/><br/>

                                    <strong>新增武器 (10种):</strong><br/>
                                    🔥火焰剑 ⚡闪电锤 🧊冰霜弓 💎钻石匕首<br/>
                                    🪓战斧 🎯回旋镖 ⚔️圣剑 🗡️毒匕首 🔨雷神锤 ✨光剑<br/><br/>

                                    <strong>高级动作:</strong><br/>
                                    💥蓄力攻击 - 长按攻击键<br/>
                                    🌀翻滚攻击 - 随机触发<br/>
                                    ⚡连击系统 - 连续攻击加成<br/><br/>

                                    <strong>功能按钮:</strong><br/>
                                    全屏 | 暂停 | AI模式 | 硬核模式 | 生存模式 | 重置 | 武器说明 | 帮助 | 音效开关<br/><br/>

                                    <strong>游戏模式:</strong><br/>
                                    💀硬核 - 50HP, 双倍伤害<br/>
                                    🎯生存 - AI无限复活，越战越强<br/><br/>

                                    <strong>精灵动画:</strong><br/>
                                    ✅ 已加载: idle, walk, run, attack_slash, hurt, victory<br/>
                                    💡 自动使用，未加载时回退到程序化绘制<br/><br/>

                                    <strong>点击任意处关闭</strong>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
