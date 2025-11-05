import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { ClientRequestArgs, IncomingMessage } from 'http';
import { AsyncSocket, AsyncSocketServer, Engine, IncomingDataPackage, ServerEngine } from 'asyncsocket';
type WebSocketEngineOptions = {
    address: null;
} | {
    address: string | URL;
    options?: WebSocket.ClientOptions | ClientRequestArgs;
} | {
    address: string | URL;
    protocols?: string | string[];
    options?: WebSocket.ClientOptions | ClientRequestArgs;
} | WebSocket;
export declare class WSIncomingDataStore<d = any> implements IncomingDataPackage<d> {
    readonly data: d;
    readonly waitId?: string;
    readonly isEvent = false;
    as: AsyncSocket;
    constructor(packageData: IncomingDataPackage);
    accept(as: AsyncSocket): this;
    send<d = any>(data: {
        [key: string]: any;
    }): Promise<IncomingDataPackage<d>>;
    sendNoReply(data: {
        [key: string]: any;
    }): void;
    private getWaitId;
}
export declare class WebSocketEngine extends EventEmitter implements Engine {
    readonly ws: WebSocket;
    constructor(wsOptions: WebSocketEngineOptions);
    send(data: {
        [key: string]: any;
    }): void;
    private createWebSocket;
    private createWebSocketFromOptions;
    private setupMessageListener;
    private handleMessage;
}
export declare class WebSocketServerEngine extends EventEmitter implements ServerEngine {
    readonly wss: WebSocket.Server<typeof WebSocket, typeof IncomingMessage>;
    constructor(serverOptions: WebSocket.ServerOptions);
    private setupConnectionListener;
    private handleConnection;
}
export declare function AsyncSocketWSClient(wsc: WebSocket): Promise<AsyncSocket<WebSocketEngine>>;
export declare function AsyncSocketWSServer(serverOptions: WebSocket.ServerOptions): AsyncSocketServer<WebSocketServerEngine, AsyncSocket<WebSocketEngine>>;
export {};
