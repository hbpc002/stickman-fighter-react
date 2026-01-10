import { useState, useEffect, useCallback } from 'react';
import { spriteAnimation } from '../classes/SpriteAnimation.js';

export function useSpriteLoader(basePath = '/sprites/') {
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [spriteStatus, setSpriteStatus] = useState({});

    const loadSprites = useCallback(async () => {
        setLoading(true);
        setError(null);

        const actions = ['idle', 'walk', 'run', 'attack_slash', 'hurt', 'victory'];
        const results = {};

        // 逐个加载以便显示进度
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            try {
                const imagePath = `${basePath}${action}_sprite.png`;
                const jsonPath = `${basePath}${action}_sprite.json`;

                const success = await spriteAnimation.loadSpriteSheet(action, imagePath, jsonPath);
                results[action] = success ? 'loaded' : 'failed';

                // 更新进度
                setProgress(Math.round(((i + 1) / actions.length) * 100));
            } catch (err) {
                results[action] = 'error';
                console.warn(`Failed to load ${action}:`, err);
            }
        }

        setSpriteStatus(results);

        const allLoaded = actions.every(action => results[action] === 'loaded');
        setLoaded(allLoaded);
        setLoading(false);

        if (!allLoaded) {
            setError('部分精灵图加载失败，将使用程序化绘制');
        }

        return allLoaded;
    }, [basePath]);

    const reloadSprites = useCallback(() => {
        return loadSprites();
    }, [loadSprites]);

    useEffect(() => {
        // 自动加载
        loadSprites();
    }, [loadSprites]);

    return {
        loading,
        loaded,
        progress,
        error,
        spriteStatus,
        loadSprites,
        reloadSprites,
        isSpriteAvailable: (action) => spriteAnimation.isLoaded(action),
        allSpritesAvailable: spriteAnimation.isAllLoaded()
    };
}
