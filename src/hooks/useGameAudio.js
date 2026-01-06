import { useEffect, useState } from 'react';

export function useGameAudio() {
    const [audioContext, setAudioContext] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);

    useEffect(() => {
        const initAudio = () => {
            if (!audioContext && soundEnabled) {
                try {
                    const context = new (window.AudioContext || window.webkitAudioContext)();
                    setAudioContext(context);
                    window.audioContext = context;
                } catch (e) {
                    console.log('Audio not supported');
                }
            }
        };

        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });

        return () => {
            document.removeEventListener('click', initAudio);
            document.removeEventListener('touchstart', initAudio);
        };
    }, [soundEnabled, audioContext]);

    const toggleSound = () => {
        const newSoundState = !soundEnabled;
        setSoundEnabled(newSoundState);
        window.soundEnabled = newSoundState;
        return newSoundState;
    };

    return { audioContext, soundEnabled, toggleSound };
}
