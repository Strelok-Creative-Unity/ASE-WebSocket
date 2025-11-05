"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServerEngine = exports.WebSocketEngine = exports.WSIncomingDataStore = void 0;
exports.AsyncSocketWSClient = AsyncSocketWSClient;
exports.AsyncSocketWSServer = AsyncSocketWSServer;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const asyncsocket_1 = require("asyncsocket");
// ============================================================================
// Utility Functions
// ============================================================================
function parseJSONMessage(message) {
    try {
        return JSON.parse(message);
    }
    catch {
        return null;
    }
}
// ============================================================================
// WSIncomingDataStore Class
// ============================================================================
class WSIncomingDataStore {
    data;
    waitId;
    isEvent = false;
    as;
    constructor(packageData) {
        this.waitId = packageData.waitId;
        this.data = packageData.data;
    }
    accept(as) {
        this.as = as;
        return this;
    }
    async send(data) {
        return this.as.send({
            ...data,
            waitId: this.getWaitId(data.waitId),
        });
    }
    sendNoReply(data) {
        this.as.engine.send({
            ...data,
            waitId: this.getWaitId(data.waitId),
        });
    }
    getWaitId(waitId) {
        return typeof waitId === 'string' ? waitId : this.waitId;
    }
}
exports.WSIncomingDataStore = WSIncomingDataStore;
WSIncomingDataStore;
class WebSocketEngine extends events_1.EventEmitter {
    ws;
    constructor(wsOptions) {
        super();
        this.ws = this.createWebSocket(wsOptions);
        this.setupMessageListener();
    }
    send(data) {
        this.ws.send(JSON.stringify(data));
    }
    // ========================================================================
    // Private Methods
    // ========================================================================
    createWebSocket(wsOptions) {
        if (wsOptions instanceof ws_1.default) {
            return wsOptions;
        }
        if (wsOptions.address === null) {
            throw new Error('WebSocket address cannot be null for WebSocketEngine.');
        }
        return this.createWebSocketFromOptions(wsOptions);
    }
    createWebSocketFromOptions(wsOptions) {
        if ('protocols' in wsOptions) {
            return new ws_1.default(wsOptions.address, wsOptions.protocols, wsOptions.options);
        }
        return new ws_1.default(wsOptions.address, wsOptions.options);
    }
    setupMessageListener() {
        this.ws.on('message', (blobMessage) => {
            this.handleMessage(blobMessage);
        });
    }
    handleMessage(blobMessage) {
        const messageString = blobMessage.toString();
        const parsedData = parseJSONMessage(messageString);
        if (parsedData === null) {
            return;
        }
        const incomingPackage = parsedData;
        this.emit('message', new WSIncomingDataStore(incomingPackage));
    }
}
exports.WebSocketEngine = WebSocketEngine;
// ============================================================================
// WebSocketServerEngine Class
// ============================================================================
class WebSocketServerEngine extends events_1.EventEmitter {
    wss;
    constructor(serverOptions) {
        super();
        this.wss = new ws_1.default.Server(serverOptions);
        this.setupConnectionListener();
    }
    // ========================================================================
    // Private Methods
    // ========================================================================
    setupConnectionListener() {
        this.wss.on('connection', (ws) => {
            this.handleConnection(ws);
        });
    }
    handleConnection(ws) {
        const engine = new WebSocketEngine(ws);
        const asyncSocket = new asyncsocket_1.AsyncSocket(engine);
        this.emit('connection', asyncSocket);
    }
}
exports.WebSocketServerEngine = WebSocketServerEngine;
// ============================================================================
// Factory Functions
// ============================================================================
function AsyncSocketWSClient(wsc) {
    return new Promise((resolve) => {
        wsc.on('open', () => {
            const engine = new WebSocketEngine(wsc);
            const asyncSocket = new asyncsocket_1.AsyncSocket(engine);
            resolve(asyncSocket);
        });
    });
}
function AsyncSocketWSServer(serverOptions) {
    const engine = new WebSocketServerEngine(serverOptions);
    return new asyncsocket_1.AsyncSocketServer(engine);
}
