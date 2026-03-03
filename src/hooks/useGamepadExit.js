import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function useGamepadExit() {
    const navigate = useNavigate();

    useEffect(() => {
        let animationFrameId;
        let lastActionTime = 0;

        const pollGamepads = () => {
            const gamepads = navigator.getGamepads();
            if (gamepads[0]) {
                const gp = gamepads[0];
                const now = Date.now();

                // 200ms debounce
                if (now - lastActionTime > 200) {
                    // Button 1 is "B" on Xbox or "Circle" on PlayStation
                    if (gp.buttons[1] && gp.buttons[1].pressed) {
                        navigate('/games'); // Instantly go back to library!
                        lastActionTime = now;
                    }
                }
            }
            animationFrameId = requestAnimationFrame(pollGamepads);
        };

        pollGamepads();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [navigate]);
}