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

    preparePackets(rawData) {
        if (!rawData) return [];

        const totalChunks = Math.ceil(rawData.length / this.config.chunkSize) || 1;
        const packets = [];
        const protoFlag = this.config.protocol.toUpperCase();
        const gridFlag = `${this.config.gridSize}x${this.config.gridSize}`;

        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.config.chunkSize;
            const payload = rawData.substring(start, start + this.config.chunkSize);
            
            // ★拡張ヘッダー: "方式|グリッド|現在コマ/全コマ|データ"
            const header = `${protoFlag}|${gridFlag}|${i + 1}/${totalChunks}|${payload}`;
            
            packets.push({
                chunkIdx: i + 1,
                totalChunks: totalChunks,
                headerText: header,
                payload: payload
            });
        }

        return packets;
    },

    processReceivedPacket(rawHeader) {
        // 例: "QR|2x2|1/3|Hello" のパース
        const parts = rawHeader.split('|');
        if (parts.length < 4) return null;

        const protocol = parts[0];
        const gridSizeStr = parts[1];
        const progressStr = parts[2];
        const payload = parts.slice(3).join('|');

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
                isComplete: isComplete,
                assembledData: isComplete ? this.assembleData() : null
            };
        }

        return { isNew: false };
    },

    assembleData() {
        if (!this.receiverState.totalExpected) return "";
        let result = "";
        for (let i = 1; i <= this.receiverState.totalExpected; i++) {
            result += this.receiverState.chunks[i] || "";
        }
        return result;
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