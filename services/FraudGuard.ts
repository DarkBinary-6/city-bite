
import { User, TelemetryData, OrderStatus } from '../types';
import { calculateDistance } from '../utils/geo';

interface FraudAnalysis {
    scoreIncrease: number;
    flag: string | null;
    evidence: any;
}

export class FraudGuard {
    private static readonly MAX_REALISTIC_SPEED_KMH = 120;
    private static readonly TELEPORT_THRESHOLD_KM = 3;
    private static readonly TELEPORT_THRESHOLD_MIN = 1;
    private static readonly ACCURACY_ABUSE_THRESHOLD_M = 200;

    /**
     * Silently analyzes partner movement for GPS spoofing or freezing patterns.
     */
    public static analyze(partner: User, next: TelemetryData, currentStatus: OrderStatus): FraudAnalysis {
        const prev = partner.lastTelemetry;
        let scoreIncrease = 0;
        let flag: string | null = null;
        let evidence: any = {};

        if (!prev) return { scoreIncrease: 0, flag: null, evidence: null };

        const timeDiffSeconds = (next.timestamp - prev.timestamp) / 1000;
        const distKm = calculateDistance(prev.lat, prev.lng, next.lat, next.lng);

        // 1. Impossible Speed Detection
        if (timeDiffSeconds > 0) {
            const speedKmh = (distKm / timeDiffSeconds) * 3600;
            if (speedKmh > this.MAX_REALISTIC_SPEED_KMH) {
                scoreIncrease += 3;
                flag = 'IMPOSSIBLE_SPEED';
                evidence = { speedKmh, limit: this.MAX_REALISTIC_SPEED_KMH };
            }
        }

        // 2. Teleport Detection (Massive jump in tiny window)
        if (timeDiffSeconds < this.TELEPORT_THRESHOLD_MIN * 60 && distKm > this.TELEPORT_THRESHOLD_KM) {
            scoreIncrease += 3;
            flag = 'TELEPORT_DETECTED';
            evidence = { distKm, timeSec: timeDiffSeconds };
        }

        // 3. Location Freeze Detection (Same coords during active delivery)
        if (distKm < 0.0001 && currentStatus === 'out_for_delivery') {
            if (timeDiffSeconds > 30) {
                 if ((partner.freezeCount || 0) > 10) { 
                    scoreIncrease += 2;
                    flag = 'LOCATION_FREEZE';
                    evidence = { duration: '5+ mins' };
                 }
            }
        }

        // 4. Accuracy Abuse
        if (next.accuracy > this.ACCURACY_ABUSE_THRESHOLD_M) {
            if ((partner.accuracyAbuseCount || 0) > 3) {
                scoreIncrease += 1;
                flag = 'ACCURACY_ABUSE';
                evidence = { accuracyMeters: next.accuracy };
            }
        }

        return { scoreIncrease, flag, evidence };
    }
}
