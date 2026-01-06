// Weapon types configuration
export const WEAPON_TYPES = [
    { name: '火焰剑', emoji: '🔥', color: '#ff4500', damage: 15, special: 'burn', durability: 5 },
    { name: '闪电锤', emoji: '⚡', color: '#ffd700', damage: 20, special: 'knockback', durability: 4 },
    { name: '冰霜弓', emoji: '🧊', color: '#00bfff', damage: 12, special: 'slow', durability: 6 },
    { name: '钻石匕首', emoji: '💎', color: '#00ffff', damage: 25, special: 'crit', durability: 3 },
    { name: '战斧', emoji: '🪓', color: '#8b4513', damage: 22, special: 'stun', durability: 4 },
    { name: '回旋镖', emoji: '🎯', color: '#ff1493', damage: 18, special: 'boomerang', durability: 5 },
    { name: '圣剑', emoji: '⚔️', color: '#ffd700', damage: 30, special: 'holy', durability: 2 },
    { name: '毒匕首', emoji: '🗡️', color: '#9370db', damage: 8, special: 'poison', durability: 7 },
    { name: '雷神锤', emoji: '🔨', color: '#4169e1', damage: 28, special: 'thunder', durability: 3 },
    { name: '光剑', emoji: '✨', color: '#00ff00', damage: 16, special: 'laser', durability: 6 }
];

// 武器类
export class Weapon {
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
        this.dropAnimation = 0;

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
                this.dropAnimation = 15;
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
