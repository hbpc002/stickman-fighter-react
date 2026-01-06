// 游戏工具函数

export const resizeCanvas = (canvas, container) => {
    if (!container) return { width: 800, height: 500 };

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

    return { width: originalWidth, height: originalHeight };
};

export const drawBackground = (ctx, width, height) => {
    // 天空渐变
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height * 0.5);

    // 地面
    const groundY = height - 80;
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
    groundGradient.addColorStop(0, '#90EE90');
    groundGradient.addColorStop(1, '#228B22');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, width, 80);

    // 地面纹理
    ctx.strokeStyle = 'rgba(0, 100, 0, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, groundY);
        ctx.lineTo(i + 5, groundY - 5);
        ctx.stroke();
    }

    // 云朵
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

export const drawWeapons = (ctx, weapons) => {
    weapons.forEach(weapon => {
        ctx.save();

        // 落地弹跳动画
        let yOffset = 0;
        if (weapon.dropAnimation > 0) {
            yOffset = Math.sin(weapon.dropAnimation * 0.5) * 5;
        }

        ctx.shadowBlur = 15;
        ctx.shadowColor = weapon.color;

        ctx.fillStyle = weapon.color;
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(weapon.emoji, weapon.x + weapon.width/2, weapon.y + weapon.height/2 + yOffset);

        if (weapon.durability > 0) {
            const barWidth = 20;
            const barHeight = 3;
            const durabilityRatio = weapon.durability / weapon.maxDurability;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(weapon.x, weapon.y - 6 + yOffset, barWidth, barHeight);

            ctx.fillStyle = durabilityRatio > 0.5 ? '#00ff00' : durabilityRatio > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(weapon.x, weapon.y - 6 + yOffset, barWidth * durabilityRatio, barHeight);
        }

        ctx.restore();
    });
};

export const drawEffects = (ctx, effects) => {
    // 伤害飘字
    effects.damageTexts = effects.damageTexts.filter(dt => {
        const alive = dt.update();
        if (alive) dt.draw(ctx);
        return alive;
    });

    // 粒子
    effects.particles = effects.particles.filter(p => {
        const alive = p.update();
        if (alive) p.draw(ctx);
        return alive;
    });

    // 飞行武器
    effects.flyingWeapons = effects.flyingWeapons.filter(fw => {
        const alive = fw.update();
        if (alive) fw.draw(ctx);
        return alive;
    });

    // 武器轨迹
    effects.weaponTrails = effects.weaponTrails.filter(wt => {
        const alive = wt.update();
        if (alive) wt.draw(ctx);
        return alive;
    });

    // 冲击波
    effects.shockwaves = effects.shockwaves.filter(sw => {
        const alive = sw.update();
        if (alive) sw.draw(ctx);
        return alive;
    });

    // 毒云
    effects.poisonClouds = effects.poisonClouds.filter(pc => {
        const alive = pc.update();
        if (alive) pc.draw(ctx);
        return alive;
    });

    // 闪电链
    effects.lightningBolts = effects.lightningBolts.filter(lb => {
        const alive = lb.update();
        if (alive) lb.draw(ctx);
        return alive;
    });

    // 激光轨迹
    effects.laserTrails = effects.laserTrails.filter(lt => {
        const alive = lt.update();
        if (alive) lt.draw(ctx);
        return alive;
    });
};

export const handleWeaponPickup = (player, weapons, stats, showNotification) => {
    weapons.forEach((weapon, index) => {
        if (weapon.onGround) {
            const distance = Math.abs(player.x - weapon.x) + Math.abs(player.y - weapon.y);

            if (distance < 40 && !player.weapon) {
                player.collectWeapon(weapon, () => {
                    weapons.splice(index, 1);
                    stats.weaponsCollected++;
                    showNotification(`${player.playerNum === 1 ? '🔵' : '🔴'} 玩家${player.playerNum} 拾取 ${weapon.name}!`, 1200);
                });
            }
        }
    });
};

export const createDamageEffect = (x, y, damage, isCrit = false) => {
    if (window.damageTexts) {
        window.damageTexts.push(
            new (class DamageText {
                constructor(x, y, damage, isCrit) {
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
            })(x, y, damage, isCrit)
        );
    }
};
