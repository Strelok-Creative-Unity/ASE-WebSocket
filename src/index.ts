import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { ClientRequestArgs, IncomingMessage } from 'http';
import { AsyncSocket, AsyncSocketServer, Engine, IncomingDataPackage, ServerEngine } from 'asyncsocket';

// ============================================================================
// Types & Interfaces
// ============================================================================

type WebSocketEngineOptions =
    | { address: null }
    | { address: string | URL; options?: WebSocket.ClientOptions | ClientRequestArgs }
    | { address: string | URL; protocols?: string | string[]; options?: WebSocket.ClientOptions | ClientRequestArgs }
    | WebSocket;

// ============================================================================
// Utility Functions
// ============================================================================

function parseJSONMessage(message: string): any | null {
    try {
        return JSON.parse(message);
    } catch {
        return null;
    }
}

// ============================================================================
// WSIncomingDataStore Class
// ============================================================================

export class WSIncomingDataStore<d = any> implements IncomingDataPackage<d> {
    readonly data: d;
    readonly waitId?: string;
    readonly isEvent = false;
    as!: AsyncSocket;

    constructor(packageData: IncomingDataPackage) {
        this.waitId = packageData.waitId;
        this.data = packageData.data;
    }

    accept(as: AsyncSocket): this {
        this.as = as;
        return this;
    }

    async send<d = any>(data: { [key: string]: any }): Promise<IncomingDataPackage<d>> {
        return this.as.send({
            ...data,
            waitId: this.getWaitId(data.waitId),
        });
    }

    sendNoReply(data: { [key: string]: any }): void {
        this.as.engine.send({
            ...data,
            waitId: this.getWaitId(data.waitId),
        });
    }

    private getWaitId(waitId?: string): string {
        return typeof waitId === 'string' ? waitId : this.waitId!;
    }
}
WSIncomingDataStore;
export class WebSocketEngine extends EventEmitter implements Engine {
    readonly ws: WebSocket;

    constructor(wsOptions: WebSocketEngineOptions) {
        super();
        this.ws = this.createWebSocket(wsOptions);
        this.setupMessageListener();
    }

    send(data: { [key: string]: any }): void {
        this.ws.send(JSON.stringify(data));
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private createWebSocket(wsOptions: WebSocketEngineOptions): WebSocket {
        if (wsOptions instanceof WebSocket) {
            return wsOptions;
        }

        if (wsOptions.address === null) {
            throw new Error('WebSocket address cannot be null for WebSocketEngine.');
        }

        return this.createWebSocketFromOptions(wsOptions);
    }

    private createWebSocketFromOptions(wsOptions: Exclude<WebSocketEngineOptions, { address: null } | WebSocket>): WebSocket {
        if ('protocols' in wsOptions) {
            return new WebSocket(wsOptions.address, wsOptions.protocols, wsOptions.options);
        }

        return new WebSocket(wsOptions.address, wsOptions.options);
    }

    private setupMessageListener(): void {
        this.ws.on('message', (blobMessage: WebSocket.Data) => {
            this.handleMessage(blobMessage);
        });
    }

    private handleMessage(blobMessage: WebSocket.Data): void {
        const messageString = blobMessage.toString();
        const parsedData = parseJSONMessage(messageString);

        if (parsedData === null) {
            return;
        }

        const incomingPackage = parsedData as unknown as IncomingDataPackage;
        this.emit('message', new WSIncomingDataStore(incomingPackage));
    }
}

// ============================================================================
// WebSocketServerEngine Class
// ============================================================================

export class WebSocketServerEngine extends EventEmitter implements ServerEngine {
    readonly wss: WebSocket.Server<typeof WebSocket, typeof IncomingMessage>;

    constructor(serverOptions: WebSocket.ServerOptions) {
        super();
        this.wss = new WebSocket.Server(serverOptions);
        this.setupConnectionListener();
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private setupConnectionListener(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            this.handleConnection(ws);
        });
    }

    private handleConnection(ws: WebSocket): void {
        const engine = new WebSocketEngine(ws);
        const asyncSocket = new AsyncSocket(engine);
        this.emit('connection', asyncSocket);
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function AsyncSocketWSClient(wsc: WebSocket): Promise<AsyncSocket<WebSocketEngine>> {
    return new Promise((resolve) => {
        wsc.on('open', () => {
            const engine = new WebSocketEngine(wsc);
            const asyncSocket = new AsyncSocket<WebSocketEngine>(engine);
            resolve(asyncSocket);
        });
    });
}

export function AsyncSocketWSServer(serverOptions: WebSocket.ServerOptions): AsyncSocketServer<WebSocketServerEngine, AsyncSocket<WebSocketEngine>> {
    const engine = new WebSocketServerEngine(serverOptions);
    return new AsyncSocketServer<WebSocketServerEngine, AsyncSocket<WebSocketEngine>>(engine);
}
