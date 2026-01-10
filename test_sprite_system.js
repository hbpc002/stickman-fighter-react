// 精灵系统测试脚本
// 在浏览器控制台运行，或通过Node.js测试

import { SpriteAnimation } from './src/classes/SpriteAnimation.js';

async function testSpriteSystem() {
    console.log('🧪 测试精灵动画系统...\n');

    const spriteAnim = new SpriteAnimation();
    const actions = ['idle', 'walk', 'run', 'attack_slash', 'hurt', 'victory'];

    console.log('1. 测试加载精灵表...');
    for (const action of actions) {
        const result = await spriteAnim.loadSpriteSheet(
            action,
            `/sprites/${action}_sprite.png`,
            `/sprites/${action}_sprite.json`
        );
        console.log(`   ${action}: ${result ? '✅' : '❌'}`);
    }

    console.log('\n2. 检查加载状态...');
    const allLoaded = spriteAnim.isAllLoaded();
    console.log(`   所有精灵表加载: ${allLoaded ? '✅' : '❌'}`);

    if (allLoaded) {
        console.log('\n3. 元数据检查:');
        actions.forEach(action => {
            const meta = spriteAnim.getMetadata(action);
            if (meta) {
                console.log(`   ${action}: ${meta.frameCount}帧 @ ${meta.fps}FPS (${meta.frameWidth}x${meta.frameHeight})`);
            }
        });

        console.log('\n4. 绘制测试 (需要Canvas)...');
        console.log('   请在浏览器中运行此测试');
    } else {
        console.log('\n⚠️ 部分精灵表未加载，将使用程序化绘制');
    }

    console.log('\n📊 测试完成');
    return allLoaded;
}

// 如果在浏览器环境
if (typeof window !== 'undefined') {
    window.testSpriteSystem = testSpriteSystem;
    console.log('已注册 testSpriteSystem() 到全局');
}

export { testSpriteSystem };
