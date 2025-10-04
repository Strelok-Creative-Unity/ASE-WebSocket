import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { ClientRequestArgs, IncomingMessage } from 'http';
import { AsyncSocket, AsyncSocketPackageData, AsyncSocketServer, Engine, IncomingDataPackage, JSONValue, ServerEngine } from 'asyncsocket';

function JSONParse(message: string) {
    try {
        return JSON.parse(message);
    } catch (err) {
        return null;
    }
}

type WebSocketEngineOptions =
    | { address: null }
    | { address: string | URL; options?: WebSocket.ClientOptions | ClientRequestArgs }
    | { address: string | URL; protocols?: string | string[]; options?: WebSocket.ClientOptions | ClientRequestArgs }
    | WebSocket;

export class WSIncomingDataStore implements IncomingDataPackage {
    data: JSONValue;
    waitId?: string;
    isEvent = false;
    as!: AsyncSocket;
    constructor(packageData: IncomingDataPackage) {
        this.waitId = packageData.waitId;
        this.data = packageData.data;
    }
    accept(as: AsyncSocket) {
        this.as = as;
        return this;
    }
    async send<d extends JSONValue = JSONValue>(data: AsyncSocketPackageData): Promise<IncomingDataPackage<d>> {
        return this.as.send({
            ...data,
            waitId: typeof data.waitId === 'string' ? data.waitId : this.waitId!,
        });
    }
    async sendNoReply(data: AsyncSocketPackageData) {
        return this.as.engine.send({
            ...data,
            waitId: typeof data.waitId === 'string' ? data.waitId : this.waitId!,
        });
    }
}

export class WebSocketEngine extends EventEmitter implements Engine {
    public ws: WebSocket;
    constructor(wsOptions: WebSocketEngineOptions) {
        super();
        if (wsOptions instanceof WebSocket) {
            this.ws = wsOptions;
        } else {
            if (wsOptions.address === null) {
                throw new Error('WebSocket address cannot be null for WebSocketEngine.');
            }

            this.ws =
                'protocols' in wsOptions
                    ? new WebSocket(wsOptions.address, wsOptions.protocols, wsOptions.options)
                    : new WebSocket(wsOptions.address, wsOptions.options);
        }

        this.listen();
    }
    listen() {
        this.ws.on('message', (blobMessage) => {
            const data = JSONParse(blobMessage.toString());
            if (data === null) return;
            this.emit('message', new WSIncomingDataStore(data));
        });
    }
    send(data: JSONValue) {
        this.ws.send(JSON.stringify(data));
    }
}

export class WebSocketServerEngine extends EventEmitter implements ServerEngine {
    public wss: WebSocket.Server<typeof WebSocket, typeof IncomingMessage>;
    constructor(serverOptions: WebSocket.ServerOptions) {
        super();
        this.wss = new WebSocket.Server(serverOptions);
        this.listen();
    }
    listen() {
        this.wss.on('connection', (ws) => {
            const wsr = new AsyncSocket(new WebSocketEngine(ws));
            this.emit('connection', wsr);
        });
    }
}

export function AsyncSocketWSClient(wsc: WebSocket): Promise<AsyncSocket> {
    return new Promise((resolve, reject) => {
        wsc.on('open', async () => {
            const engine = new WebSocketEngine(wsc);
            const wsr = new AsyncSocket(engine);
            resolve(wsr);
        });
    });
}

export function AsyncSocketWSServer(wsc: WebSocket.ServerOptions) {
    const engine = new WebSocketServerEngine(wsc);
    return new AsyncSocketServer(engine);
}
