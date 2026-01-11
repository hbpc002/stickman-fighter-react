import { useState, useEffect, useCallback } from 'react';
import { exaggeratedSpriteAnimation } from '../classes/ExaggeratedSpriteAnimation.js';

export function useExaggeratedSprites(basePath = '/sprites/') {
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState({});

    const loadSprites = useCallback(async () => {
        setLoading(true);
        setError(null);

        const actions = ['idle', 'walk', 'run', 'attack_slash', 'hurt', 'victory'];
        const results = {};

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            try {
                const imagePath = `${basePath}${action}_sprite.png`;
                const jsonPath = `${basePath}${action}_sprite.json`;

                const success = await exaggeratedSpriteAnimation.loadSpriteSheet(
                    action, imagePath, jsonPath
                );

                results[action] = success ? 'loaded' : 'failed';
                setProgress(Math.round(((i + 1) / actions.length) * 100));
            } catch (err) {
                results[action] = 'error';
            }
        }

        setStatus(results);

        const allLoaded = actions.every(action => results[action] === 'loaded');
        setLoaded(allLoaded);
        setLoading(false);

        if (!allLoaded) {
            setError('部分精灵图加载失败，将使用程序化绘制');
        }

        return allLoaded;
    }, [basePath]);

    const reload = useCallback(() => loadSprites(), [loadSprites]);

    useEffect(() => {
        loadSprites();
    }, [loadSprites]);

    return {
        loading,
        loaded,
        progress,
        error,
        status,
        loadSprites,
        reload,
        isAvailable: (action) => exaggeratedSpriteAnimation.isLoaded(action),
        allAvailable: exaggeratedSpriteAnimation.isAllLoaded()
    };
}
