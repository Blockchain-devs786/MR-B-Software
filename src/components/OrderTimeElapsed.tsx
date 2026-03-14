import { useState, useEffect } from 'react';

interface OrderTimeElapsedProps {
    createdAt: string;
    updatedAt?: string;
    status?: string;
}

const OrderTimeElapsed = ({ createdAt, updatedAt, status }: OrderTimeElapsedProps) => {
    const [elapsed, setElapsed] = useState<string>('');

    useEffect(() => {
        const isTerminal = status === 'Completed' || status === 'Cancelled' || status === 'Refunded';

        const updateElapsed = () => {
            const start = new Date(createdAt).getTime();
            // If terminal state and we have updatedAt, use that as the end time. Otherwise, current time.
            const end = (isTerminal && updatedAt) ? new Date(updatedAt).getTime() : Date.now();
            const diff = end - start;
            
            if (diff < 0) {
                setElapsed('0s');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            let timeStr = '';
            if (hours > 0) timeStr += `${hours}h `;
            if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
            timeStr += `${seconds}s`;

            setElapsed(timeStr);
        };

        // Initial update
        updateElapsed();

        // If terminal state, do not tick anymore
        if (isTerminal) return;

        // Timer for updates
        const intervalId = setInterval(updateElapsed, 1000);
        return () => clearInterval(intervalId);
    }, [createdAt, updatedAt, status]);

    return <span>{elapsed}</span>;
}

export default OrderTimeElapsed;
