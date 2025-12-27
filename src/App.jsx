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
            }

            if (this.x < 0) this.x = 0;
            if (this.x + this.width > this.canvasWidth) this.x = this.canvasWidth - this.width;
        }

        this.lifetime--;
    }

    isExpired() {
        return this.lifetime <= 0;
    }
}

// Stickman player class
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
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackRange = 50;
        this.attackDamage = 10;

        this.isBlocking = false;
        this.blockStaminaDrain = 0.5;

        this.combo = 0;
        this.lastHitTime = 0;

        this.weapon = null;
        this.burnDamage = 0;
        this.burnTimer = 0;
        this.slowTimer = 0;
        this.stunTimer = 0;

        this.aiEnabled = false;
        this.aiState = 'idle';
        this.aiTimer = 0;
    }

    update(keys, opponent) {
        // 状态效果更新
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
            return; // 被眩晕时无法行动
        }

        // AI控制
        if (this.aiEnabled && opponent) {
            this.updateAI(opponent);
            return;
        }

        // 玩家控制
        const speed = this.slowTimer > 0 ? this.speed * 0.5 : this.speed;

        // 左右移动
        if (keys[this.controls.left]) {
            this.vx = -speed;
        } else if (keys[this.controls.right]) {
            this.vx = speed;
        } else {
            this.vx *= 0.8; // 摩擦力
        }

        // 跳跃
        if (keys[this.controls.jump] && !this.isJumping) {
            this.vy = -this.jumpPower;
            this.isJumping = true;
            this.stamina -= 5;
        }

        // 攻击
        if (keys[this.controls.attack] && this.attackCooldown <= 0 && this.stamina >= 10) {
            this.attack(opponent);
        }

        // 防御
        if (keys[this.controls.block] && this.stamina > 0) {
            this.isBlocking = true;
            this.stamina -= this.blockStaminaDrain;
        } else {
            this.isBlocking = false;
        }

        // 武器使用 (F或J键)
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
        if (this.stamina < this.maxStamina && !this.isAttacking && !this.isBlocking) {
            this.stamina += this.staminaRegen;
        }

        // 攻击冷却
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // 连击重置
        if (Date.now() - this.lastHitTime > 2000) {
            this.combo = 0;
        }
    }

    updateAI(opponent) {
        this.aiTimer++;

        const speed = this.slowTimer > 0 ? this.speed * 0.5 : this.speed;
        const distance = Math.abs(this.x - opponent.x);

        // 简单状态机
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
                // 随机跳跃
                if (Math.random() < 0.02 && !this.isJumping) {
                    this.vy = -this.jumpPower;
                    this.isJumping = true;
                }
                break;

            case 'attack':
                if (this.attackCooldown <= 0 && this.stamina >= 10) {
                    this.attack(opponent);
                }
                // 保持距离
                if (distance < 40) {
                    this.vx = this.x < opponent.x ? -speed : speed;
                }
                break;

            case 'defend':
                this.isBlocking = true;
                this.stamina -= this.blockStaminaDrain;
                // 后退
                this.vx = this.x < opponent.x ? -speed : speed;
                break;

            default:
                this.vx *= 0.8;
                // 偶尔随机移动
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

        if (this.stamina < this.maxStamina && !this.isBlocking) {
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
        this.attackCooldown = 30;
        this.stamina -= 10;

        // 检查距离
        const distance = Math.abs(this.x - opponent.x);
        if (distance <= this.attackRange) {
            let damage = this.attackDamage;

            // 暴击
            if (Math.random() < 0.15) {
                damage = Math.floor(damage * 1.5);
            }

            // 连击加成
            this.combo++;
            if (this.combo > 1) {
                damage += Math.floor(this.combo * 1.5);
            }

            // 防御减伤
            if (opponent.isBlocking && opponent.stamina > 0) {
                damage = Math.floor(damage * 0.3);
                opponent.stamina -= 5;
            }

            opponent.takeDamage(damage, this);
            this.lastHitTime = Date.now();

            // 播放音效
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

            // 特殊效果
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
                    if (Math.random() < 0.3) damage *= 2;
                    break;
                case 'stun':
                    opponent.stunTimer = 30;
                    break;
                case 'boomerang':
                    damage = Math.floor(damage * 1.2);
                    break;
            }

            opponent.takeDamage(damage, this);
            this.weapon.durability--;

            if (this.weapon.durability <= 0) {
                this.weapon = null;
            }

            this.playSound('weapon_special');
        }
    }

    takeDamage(damage, attacker) {
        if (this.isBlocking && this.stamina > 0) {
            damage = Math.floor(damage * 0.3);
            this.stamina -= 10;
        }

        this.hp -= damage;

        // 击退
        if (attacker) {
            const direction = this.x < attacker.x ? -1 : 1;
            this.vx = direction * 5;
        }

        this.playSound('hit');
    }

    collectWeapon(weapon) {
        this.weapon = weapon;
        this.playSound('weapon_pickup');
    }

    playSound(type) {
        // 音效模拟（在React中通过Web Audio API实现）
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

        // 状态效果视觉反馈
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

        // 头
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + 10, 8, 0, Math.PI * 2);
        ctx.stroke();

        // 身体
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + 18);
        ctx.lineTo(this.x + this.width/2, this.y + 40);
        ctx.stroke();

        // 手臂
        const armOffset = this.isAttacking ? 10 : 5;
        ctx.beginPath();
        if (this.controls.attack === 'a') {
            // 玩家1（红色）- 左手攻击
            ctx.moveTo(this.x + this.width/2, this.y + 22);
            ctx.lineTo(this.x + this.width/2 - armOffset, this.y + 30);
        } else {
            // 玩家2（蓝色）- 右手攻击
            ctx.moveTo(this.x + this.width/2, this.y + 22);
            ctx.lineTo(this.x + this.width/2 + armOffset, this.y + 30);
        }
        ctx.stroke();

        // 腿
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + 40);
        ctx.lineTo(this.x + this.width/2 - 8, this.y + 60);
        ctx.moveTo(this.x + this.width/2, this.y + 40);
        ctx.lineTo(this.x + this.width/2 + 8, this.y + 60);
        ctx.stroke();

        // 防御姿态
        if (this.isBlocking) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + 30, 15, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 武器图标
        if (this.weapon) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.weapon.emoji, this.x + this.width/2, this.y - 15);
        }

        // 血条和体力条
        const barWidth = 40;
        const barHeight = 4;
        const barX = this.x + this.width/2 - barWidth/2;
        const barY = this.y - 25;

        // 血条背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // 血条
        const hpRatio = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = hpRatio > 0.5 ? '#00ff00' : hpRatio > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        // 体力条背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY + 5, barWidth, 3);

        // 体力条
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
        stats: {
            p1: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 },
            p2: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 }
        },
        animationFrame: null,
        canvasWidth: 800,
        canvasHeight: 500
    });

    // Initialize audio context
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

        // Initialize on user interaction
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
    }, [gameState.soundEnabled]);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
            setGameState(prev => ({ ...prev, isMobile }));
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Portrait warning
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

    // Keyboard controls
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

    // Initialize game
    const initGame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;

        // Resize canvas
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

        // Initialize players
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

        // Position on ground
        const groundLevel = gameRef.current.canvasHeight - 80;
        gameRef.current.player1.y = groundLevel - gameRef.current.player1.height;
        gameRef.current.player2.y = groundLevel - gameRef.current.player2.height;

        // Reset state
        setGameState(prev => ({
            ...prev,
            gameOver: false,
            paused: false,
            winner: null
        }));

        gameRef.current.weapons = [];
        gameRef.current.weaponDropTimer = 0;
        gameRef.current.stats = {
            p1: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 },
            p2: { hits: 0, damage: 0, maxCombo: 0, weaponsCollected: 0 }
        };

        showNotification('🔥 战斗开始！', 1500);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    // Draw background
    const drawBackground = (ctx) => {
        const width = gameRef.current.canvasWidth;
        const height = gameRef.current.canvasHeight;

        // Sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(1, '#E0F6FF');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height * 0.5);

        // Ground
        const groundY = height - 80;
        const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
        groundGradient.addColorStop(0, '#90EE90');
        groundGradient.addColorStop(1, '#228B22');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, width, 80);

        // Ground pattern (grass)
        ctx.strokeStyle = 'rgba(0, 100, 0, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, groundY);
            ctx.lineTo(i + 5, groundY - 5);
            ctx.stroke();
        }

        // Clouds
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

    // Draw weapons
    const drawWeapons = (ctx) => {
        gameRef.current.weapons.forEach(weapon => {
            // 光效
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = weapon.color;

            // 武器主体
            ctx.fillStyle = weapon.color;
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(weapon.emoji, weapon.x + weapon.width/2, weapon.y + weapon.height/2);

            // 耐久度
            if (weapon.durability > 0) {
                const barWidth = 20;
                const barHeight = 3;
                const durabilityRatio = weapon.durability / weapon.maxDurability;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(weapon.x, weapon.y - 6, barWidth, barHeight);

                ctx.fillStyle = durabilityRatio > 0.5 ? '#00ff00' : durabilityRatio > 0.25 ? '#ffff00' : '#ff0000';
                ctx.fillRect(weapon.x, weapon.y - 6, barWidth * durabilityRatio, barHeight);
            }

            ctx.restore();
        });
    };

    // Game loop
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gameRef.current.player1 || !gameRef.current.player2) return;

        const ctx = canvas.getContext('2d');
        const p1 = gameRef.current.player1;
        const p2 = gameRef.current.player2;

        // Clear canvas
        ctx.clearRect(0, 0, gameRef.current.canvasWidth, gameRef.current.canvasHeight);

        // Draw background
        drawBackground(ctx);

        // Update and draw weapons
        if (!gameState.paused && !gameState.gameOver) {
            gameRef.current.weapons = gameRef.current.weapons.filter(weapon => {
                weapon.update();
                return !weapon.isExpired();
            });

            // Weapon drop system
            gameRef.current.weaponDropTimer++;
            if (gameRef.current.weaponDropTimer > 300) { // Every 5 seconds
                const x = Math.random() * (gameRef.current.canvasWidth - 100) + 50;
                const weapon = new Weapon(x, 100, gameRef.current.canvasWidth, gameRef.current.canvasHeight);
                gameRef.current.weapons.push(weapon);
                gameRef.current.weaponDropTimer = 0;
                showNotification('✨ 武器掉落!', 800);
            }

            // Weapon pickup
            gameRef.current.weapons.forEach((weapon, index) => {
                if (weapon.onGround) {
                    // Check collision with players
                    const p1Dist = Math.abs(p1.x - weapon.x) + Math.abs(p1.y - weapon.y);
                    const p2Dist = Math.abs(p2.x - weapon.x) + Math.abs(p2.y - weapon.y);

                    if (p1Dist < 40 && !p1.weapon) {
                        p1.collectWeapon(weapon);
                        gameRef.current.weapons.splice(index, 1);
                        gameRef.current.stats.p1.weaponsCollected++;
                        showNotification(`🔵 玩家1 拾取 ${weapon.name}!`, 1200);
                    } else if (p2Dist < 40 && !p2.weapon) {
                        p2.collectWeapon(weapon);
                        gameRef.current.weapons.splice(index, 1);
                        gameRef.current.stats.p2.weaponsCollected++;
                        showNotification(`🔵 玩家2 拾取 ${weapon.name}!`, 1200);
                    }
                }
            });
        }

        drawWeapons(ctx);

        // Update players
        if (!gameState.paused && !gameState.gameOver) {
            p1.update(keys, p2);
            p2.update(keys, p1);

            // Check for weapon use and update stats
            if (p1.weapon && p1.weapon.durability < p1.weapon.maxDurability) {
                gameRef.current.stats.p1.damage += p1.weapon.baseDamage;
            }
            if (p2.weapon && p2.weapon.durability < p2.weapon.maxDurability) {
                gameRef.current.stats.p2.damage += p2.weapon.baseDamage;
            }

            // Check game over
            if (p1.hp <= 0 || p2.hp <= 0) {
                const winner = p1.hp > 0 ? '玩家1' : '玩家2';
                setGameState(prev => ({
                    ...prev,
                    gameOver: true,
                    winner: winner
                }));
                showNotification(`🎉 ${winner} 获胜!`, 3000);
            }

            // Update combo indicator
            if (p1.combo > 1 || p2.combo > 1) {
                const maxCombo = Math.max(p1.combo, p2.combo);
                setCombo({ show: true, text: `${maxCombo} 连击!` });
            } else {
                setCombo({ show: false, text: '' });
            }

            // Update weapon status
            if (p1.weapon || p2.weapon) {
                const status = [];
                if (p1.weapon) status.push(`🔵: ${p1.weapon.name}(${p1.weapon.durability})`);
                if (p2.weapon) status.push(`🔴: ${p2.weapon.name}(${p2.weapon.durability})`);
                setWeaponStatus({ show: true, text: status.join(' | ') });
            } else {
                setWeaponStatus({ show: false, text: '' });
            }
        }

        // Draw players
        p1.draw(ctx);
        p2.draw(ctx);

        // Continue loop
        if (!gameState.gameOver) {
            gameRef.current.animationFrame = requestAnimationFrame(gameLoop);
        }
    }, [keys, gameState.paused, gameState.gameOver]);

    // Start game loop
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

    // Show notification
    const showNotification = (message, duration = 1500) => {
        setNotification({ show: true, message, duration });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, duration);
    };

    // Button handlers
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
            '🪓 战斧 - 22伤害 + 重击\n' +
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

    // Touch controls for mobile
    const handleTouchStart = (key) => {
        setKeys(prev => ({ ...prev, [key]: true }));
    };

    const handleTouchEnd = (key) => {
        setKeys(prev => ({ ...prev, [key]: false }));
    };

    return (
        <div className="main-container">
            {/* Portrait Warning */}
            {gameState.showPortraitWarning && (
                <div className="portrait-warning show">
                    <div className="icon">📱</div>
                    <h2>请旋转设备</h2>
                    <p>建议使用横屏模式以获得最佳体验</p>
                </div>
            )}

            {/* Left Control Panel - Player 1 */}
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

            {/* Center - Canvas and Status */}
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative'}}>
                {/* Top Status Bar */}
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

                {/* Combo Indicator */}
                {combo.show && (
                    <div className="combo-indicator show">{combo.text}</div>
                )}

                {/* Weapon Status */}
                {weaponStatus.show && (
                    <div className="weapon-status show">{weaponStatus.text}</div>
                )}

                {/* Mode Indicator */}
                {modeIndicator.show && (
                    <div className="mode-indicator">{modeIndicator.text}</div>
                )}

                {/* Canvas Container */}
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

                    {/* Game Over Overlay */}
                    {gameState.gameOver && (
                        <div className="game-over-overlay show">
                            <div className="winner-text">{gameState.winner} 获胜!</div>
                            <button className="reset-btn" onClick={handleReset}>🔄 再战一局</button>
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
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

            {/* Right Control Panel - Player 2 */}
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

            {/* Notification */}
            {notification.show && (
                <div className="notification show" style={{whiteSpace: 'pre-line'}}>
                    {notification.message}
                </div>
            )}
        </div>
    );
}
