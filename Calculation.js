/**
 * Calculation.js - 光学通信システム 計算・制御コアモジュール
 */
const Calculation = {
    config: {
        gridSize: 3,         // N x N
        chunkSize: 20,       // 1コマあたりの文字数
        protocol: 'qr'       // 'qr' または 'apriltag'
    },

    receiverState: {
        chunks: {},
        totalExpected: null,
        detectedProtocol: null
    },

    /**
     * 送信データをコマ分割してパケット化する
     */
    preparePackets(rawData) {
        if (!rawData) return [];

        const totalChunks = Math.ceil(rawData.length / this.config.chunkSize) || 1;
        const packets = [];
        const protoFlag = this.config.protocol.toUpperCase(); // "QR" または "APRILTAG" -> "AT"

        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.config.chunkSize;
            const payload = rawData.substring(start, start + this.config.chunkSize);
            
            // ★自動認識用ヘッダー構造: "方式|現在コマ/全コマ|ペイロード"
            const header = `${protoFlag}|${i + 1}/${totalChunks}|${payload}`;
            
            packets.push({
                chunkIdx: i + 1,
                totalChunks: totalChunks,
                headerText: header,
                payload: payload
            });
        }

        return packets;
    },

    /**
     * 受信したパケットデータの解析
     */
    processReceivedPacket(rawHeader) {
        // ヘッダー判定 (例: QR|1/3|データ または 1/3|データ)
        let protocol = "UNKNOWN";
        let headerBody = rawHeader;

        if (rawHeader.includes('|')) {
            const parts = rawHeader.split('|');
            if (parts[0] === 'QR' || parts[0] === 'APRILTAG' || parts[0] === 'AT') {
                protocol = parts[0];
                headerBody = parts.slice(1).join('|');
            }
        }

        const match = headerBody.match(/^(\d+)\/(\d+)\|(.*)$/s);
        if (!match) return null;

        const currentIdx = parseInt(match[1], 10);
        const totalChunks = parseInt(match[2], 10);
        const payload = match[3];

        this.receiverState.totalExpected = totalChunks;
        this.receiverState.detectedProtocol = protocol;

        if (!this.receiverState.chunks[currentIdx]) {
            this.receiverState.chunks[currentIdx] = payload;
            
            const currentCount = Object.keys(this.receiverState.chunks).length;
            const isComplete = currentCount === totalChunks;

            return {
                isNew: true,
                protocol: protocol,
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
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculation;
}