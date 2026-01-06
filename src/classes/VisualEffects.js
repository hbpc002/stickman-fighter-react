// 伤害飘字类
export class DamageText {
    constructor(x, y, damage, isCrit = false) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.isCrit = isCrit;
        this.vy = -2;
        this.life = 60;
        this.alpha = 1;
    }

    update() {
        this.y += this.vy;
        this.life--;
        this.alpha = this.life / 60;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = `${this.isCrit ? 'bold ' : ''}20px Arial`;
        ctx.textAlign = 'center';

        if (this.isCrit) {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffff00';
            ctx.fillText(`💥 ${this.damage}`, this.x, this.y);
        } else {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillText(this.damage, this.x, this.y);
        }

        ctx.restore();
    }
}

// 特效粒子类
export class Particle {
    constructor(x, y, color, type = 'normal') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 30;
        this.alpha = 1;
        this.size = type === 'special' ? 6 : 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.alpha = this.life / 30;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 武器拾取动画类
export class FlyingWeapon {
    constructor(weapon, targetX, targetY) {
        this.weapon = weapon;
        this.x = weapon.x;
        this.y = weapon.y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = 8;
        this.life = 30;
        this.reached = false;
    }

    update() {
        if (this.reached) return false;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
            this.reached = true;
            return false;
        }

        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.weapon.color;
        ctx.fillStyle = this.weapon.color;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.weapon.emoji, this.x, this.y);
        ctx.restore();
    }
}

// 武器挥舞轨迹类
export class WeaponTrail {
    constructor(x, y, color, emoji) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.emoji = emoji;
        this.life = 15;
        this.alpha = 1;
        this.rotation = 0;
    }

    update() {
        this.life--;
        this.alpha = this.life / 15;
        this.rotation += 0.3;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha * 0.7;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.emoji, 0, 0);
        ctx.restore();
    }
}

// 冲击波类
export class Shockwave {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 5;
        this.maxRadius = 30;
        this.life = 20;
        this.alpha = 1;
    }

    update() {
        this.radius += (this.maxRadius - this.radius) * 0.3;
        this.life--;
        this.alpha = this.life / 20;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// 毒云效果类
export class PoisonCloud {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.life = 60;
        this.alpha = 1;

        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 4 + 2
            });
        }
    }

    update() {
        this.life--;
        this.alpha = this.life / 60;
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
        });
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha * 0.6;
        ctx.fillStyle = '#9370db';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#9370db';

        this.particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

// 闪电链效果类
export class LightningBolt {
    constructor(x1, y1, x2, y2, color) {
        this.segments = [];
        this.life = 15;
        this.alpha = 1;
        this.color = color;

        const steps = 8;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 15;
            const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 15;
            this.segments.push({ x, y });
        }
    }

    update() {
        this.life--;
        this.alpha = this.life / 15;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.moveTo(this.segments[0].x, this.segments[0].y);
        for (let i = 1; i < this.segments.length; i++) {
            ctx.lineTo(this.segments[i].x, this.segments[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }
}

// 激光轨迹类
export class LaserTrail {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 20;
        this.alpha = 1;
        this.width = 30;
    }

    update() {
        this.life--;
        this.alpha = this.life / 20;
        this.width *= 0.9;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 新增：连击特效类
export class ComboEffect {
    constructor(x, y, comboCount) {
        this.x = x;
        this.y = y;
        this.comboCount = comboCount;
        this.life = 40;
        this.alpha = 1;
        this.vy = -1;
        this.scale = 1;
    }

    update() {
        this.life--;
        this.alpha = this.life / 40;
        this.y += this.vy;
        this.scale = 1 + (40 - this.life) / 40;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // 连击数字
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd93d';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffd93d';
        ctx.fillText(`${this.comboCount} COMBO!`, 0, 0);

        ctx.restore();
    }
}

// 新增：特殊攻击特效类
export class SpecialAttackEffect {
    constructor(x, y, type, color) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
        this.life = 25;
        this.alpha = 1;
        this.radius = 5;
        this.maxRadius = 40;
    }

    update() {
        this.life--;
        this.alpha = this.life / 25;
        this.radius += (this.maxRadius - this.radius) * 0.2;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.type === 'uppercut') {
            // 上勾拳特效 - 向上冲击
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y - 10, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'kick') {
            // 踢腿特效 - 扇形
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, -Math.PI/4, Math.PI/4);
            ctx.lineTo(this.x, this.y);
            ctx.fill();
        } else if (this.type === 'roll') {
            // 翻滚特效 - 螺旋
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + i * 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}
