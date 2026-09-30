/**
 * Calculation.js - ヘッダー拡張版
 */
const Calculation = {
    config: {
        gridSize: 2,         // N x N
        chunkSize: 20,       // 1コマあたりの文字数
        protocol: 'qr'       // 'qr' または 'apriltag'
    },

    receiverState: {
        chunks: {},
        totalExpected: null,
        detectedProtocol: null,
        detectedGridSize: null
    },

    checksumFor(payload) {
        let hash = 2166136261;
        for (let i = 0; i < payload.length; i++) {
            hash ^= payload.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    },

    escapePayload(payload) {
        return encodeURIComponent(String(payload));
    },

    unescapePayload(payload) {
        try {
            return decodeURIComponent(String(payload));
        } catch (error) {
            return String(payload);
        }
    },

    validateChecksum(payload, checksum) {
        if (!checksum) return true;
        if (typeof checksum !== 'string') return false;
        return checksum.toLowerCase() === this.checksumFor(payload).toLowerCase();
    },

    preparePackets(rawData) {
        if (!rawData) return [];

        const text = String(rawData);
        const totalChunks = Math.ceil(text.length / this.config.chunkSize) || 1;
        const packets = [];
        const protoFlag = this.config.protocol.toUpperCase();
        const gridFlag = `${this.config.gridSize}x${this.config.gridSize}`;

        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.config.chunkSize;
            const payload = text.substring(start, start + this.config.chunkSize);
            const encodedPayload = this.escapePayload(payload);
            const checksum = this.checksumFor(encodedPayload);

            const header = `${protoFlag}|${gridFlag}|${i + 1}/${totalChunks}|${encodedPayload}|${checksum}`;

            packets.push({
                chunkIdx: i + 1,
                totalChunks: totalChunks,
                protocol: protoFlag,
                gridSize: gridFlag,
                headerText: header,
                payload: payload,
                checksum: checksum,
                encodedPayload: encodedPayload
            });
        }

        return packets;
    },

    processReceivedPacket(rawHeader) {
        // 例: "QR|2x2|1/3|Hello%20World|A1B2C3D4" のパース
        const parts = rawHeader.split('|');
        if (parts.length < 4) return null;

        const protocol = parts[0];
        const gridSizeStr = parts[1];
        const progressStr = parts[2];
        const maybeChecksum = /^[0-9a-fA-F]{8}$/.test(parts[parts.length - 1]) ? parts.pop() : null;
        const encodedPayload = parts.slice(3).join('|');
        const payload = this.unescapePayload(encodedPayload);

        if (maybeChecksum && !this.validateChecksum(encodedPayload, maybeChecksum)) {
            return null;
        }

        const match = progressStr.match(/^(\d+)\/(\d+)$/);
        if (!match) return null;

        const currentIdx = parseInt(match[1], 10);
        const totalChunks = parseInt(match[2], 10);

        this.receiverState.totalExpected = totalChunks;
        this.receiverState.detectedProtocol = protocol;
        this.receiverState.detectedGridSize = gridSizeStr;

        if (!this.receiverState.chunks[currentIdx]) {
            this.receiverState.chunks[currentIdx] = payload;

            const currentCount = Object.keys(this.receiverState.chunks).length;
            const isComplete = currentCount === totalChunks;

            return {
                isNew: true,
                protocol: protocol,
                gridSize: gridSizeStr,
                currentIdx: currentIdx,
                totalChunks: totalChunks,
                receivedCount: currentCount,
                payload: payload,
                checksum: maybeChecksum,
                isComplete: isComplete,
                assembledData: isComplete ? this.assembleData() : null
            };
        }

        if (this.receiverState.chunks[currentIdx] === payload) {
            return { isNew: false, reason: 'duplicate' };
        }

        return { isNew: false, reason: 'replaced' };
    },

    assembleData() {
        if (!this.receiverState.totalExpected) return "";
        let result = "";
        for (let i = 1; i <= this.receiverState.totalExpected; i++) {
            result += this.receiverState.chunks[i] || "";
        }
        return result;
    },

    getProgressSummary() {
        const totalChunks = this.receiverState.totalExpected || 0;
        const receivedCount = Object.keys(this.receiverState.chunks).length;
        const missingIndexes = [];

        for (let i = 1; i <= totalChunks; i++) {
            if (!(i in this.receiverState.chunks)) {
                missingIndexes.push(i);
            }
        }

        return {
            totalChunks: totalChunks,
            receivedCount: receivedCount,
            missingCount: missingIndexes.length,
            missingIndexes: missingIndexes,
            hasMissing: missingIndexes.length > 0
        };
    },

    buildRetryQueue() {
        const summary = this.getProgressSummary();
        return summary.missingIndexes;
    },

    getRetryStatus() {
        const retryQueue = this.buildRetryQueue();
        const status = {
            isRetryRequired: retryQueue.length > 0,
            retryQueue: retryQueue,
            nextRetryIndex: retryQueue[0] ?? null,
            nextRetryChunk: retryQueue[0] ? this.receiverState.chunks[retryQueue[0]] ?? null : null
        };
        return status;
    },

    resetReceiver() {
        this.receiverState.chunks = {};
        this.receiverState.totalExpected = null;
        this.receiverState.detectedProtocol = null;
        this.receiverState.detectedGridSize = null;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculation;
}