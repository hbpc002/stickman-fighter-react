import { useEffect, useState } from 'react';

export function useDeviceDetection() {
    const [isMobile, setIsMobile] = useState(false);
    const [showPortraitWarning, setShowPortraitWarning] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
            setIsMobile(mobile);
        };

        const checkOrientation = () => {
            if (window.innerHeight < window.innerWidth && window.innerHeight < 500) {
                setShowPortraitWarning(false);
            } else if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
                setShowPortraitWarning(true);
            } else {
                setShowPortraitWarning(false);
            }
        };

        checkMobile();
        checkOrientation();

        window.addEventListener('resize', checkMobile);
        window.addEventListener('resize', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('resize', checkOrientation);
        };
    }, []);

    return { isMobile, showPortraitWarning };
}
