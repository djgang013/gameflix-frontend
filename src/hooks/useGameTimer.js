import { useEffect } from 'react';
import api from '../services/api';

export default function useGameTimer(gameName) {
    useEffect(() => {
        if (!gameName) return;
        // When the game page loads, record the exact start time
        const startTime = Date.now();

        // The "return" inside a useEffect acts as a cleanup function.
        // React automatically runs this exact block of code the moment the user leaves the page!
        return () => {
            const endTime = Date.now();
            const timeSpentSeconds = Math.floor((endTime - startTime) / 1000);

            // Only send to the database if they stayed for at least 5 seconds (prevents spam from accidental clicks)
            if (timeSpentSeconds > 5) {
                api.post('/stats/record', {
                    gameName: gameName,
                    timeSpentSeconds: timeSpentSeconds
                }).catch(err => console.error("Failed to save play time", err));
            }
        };
    }, [gameName]);
}