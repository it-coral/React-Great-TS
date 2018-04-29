import * as moment from 'moment';
import 'moment-duration-format';

export function formatDuration(duration: number, format: string): string {
    switch (format) {
        case 'DHMSms':
            return moment.duration(duration).format('D[d] H[h] m[m] s.ms[s]');

        case 'DHMS':
            return moment.duration(duration).format('D[d] H[h] m[m] s[s]');
        default: return '';
    }
}

// tslint:disable-next-line:no-any
export function calcChannelStat(stat: any) {
    return {
        packerErrorPCT: stat.packetLoss * 100 / stat.totalPackets || 0,
        effectiveBitRate: stat.bytes / stat.voiceDuration
    };
}
