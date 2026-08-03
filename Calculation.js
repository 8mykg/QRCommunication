/**
 * Calculation.js - 光学通信システム 計算・制御コアモジュール
 */
const Calculation = {
    // 通信設定の保持
    config: {
        gridSize: 3,         // N x N
        chunkSize: 30,       // 1コマあたりの文字数
        protocol: 'qr'       // 'qr' または 'apriltag'
    },

    // 受信用キャッシュ
    receiverState: {
        chunks: {},
        totalExpected: null
    },

    /**
     * 送信データをコマ分割してパケット化する
     * @param {string} rawData - 送信したい生のテキスト/データ
     * @returns {Array} ヘッダー付きパケットの配列
     */
    preparePackets(rawData) {
        if (!rawData) return [];

        const totalChunks = Math.ceil(rawData.length / this.config.chunkSize) || 1;
        const packets = [];

        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.config.chunkSize;
            const payload = rawData.substring(start, start + this.config.chunkSize);
            
            // 統一ヘッダー構造: "現在コマ/全コマ|ペイロード"
            const header = `${i + 1}/${totalChunks}|${payload}`;
            
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
     * 受信した生の文字列を解析・検証する
     * @param {string} rawHeader - カメラが読み取ったヘッダー付きデータ
     * @returns {Object|null} 解析結果（新規取得ならデータ、無効・重複ならnull）
     */
    processReceivedPacket(rawHeader) {
        const match = rawHeader.match(/^(\d+)\/(\d+)\|(.*)$/s);
        if (!match) return null;

        const currentIdx = parseInt(match[1], 10);
        const totalChunks = parseInt(match[2], 10);
        const payload = match[3];

        this.receiverState.totalExpected = totalChunks;

        // 重複チェック
        if (!this.receiverState.chunks[currentIdx]) {
            this.receiverState.chunks[currentIdx] = payload;
            
            const currentCount = Object.keys(this.receiverState.chunks).length;
            const isComplete = currentCount === totalChunks;

            return {
                isNew: true,
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

    /**
     * 収集したコマを順序通り結合して元データを復元
     */
    assembleData() {
        if (!this.receiverState.totalExpected) return "";

        let result = "";
        for (let i = 1; i <= this.receiverState.totalExpected; i++) {
            result += this.receiverState.chunks[i] || "";
        }
        return result;
    },

    /**
     * 受信ステートのリセット
     */
    resetReceiver() {
        this.receiverState.chunks = {};
        this.receiverState.totalExpected = null;
    }
};

// モジュールとしてエクスポート (ブラウザ・Node両対応)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculation;
}