import { AsyncSocket, AsyncSocketServer } from 'asyncsocket';
import { AsyncSocketWSClient, AsyncSocketWSServer, WebSocketEngine, WebSocketServerEngine } from '../src/index';
import { WebSocket } from 'ws';

describe('WS Server + Client', () => {
    let WSClient: AsyncSocket<WebSocketEngine>;
    let WSServer: AsyncSocketServer<WebSocketServerEngine, AsyncSocket<WebSocketEngine>>;
    let WSServerClient: AsyncSocket<WebSocketEngine>;

    beforeAll(() => {
        WSServer = AsyncSocketWSServer({ port: 52000 });

        WSServer.on('connection', (socket) => {});
    });

    afterAll(async () => {
        if (WSClient) {
            WSClient.engine.ws.close();
        }
        if (WSServer) {
            await new Promise<void>((resolve) => WSServer.engine.wss.close(() => resolve()));
        }
    });

    it('should establish a connection', async () => {
        const connectionPromise = new Promise<void>((resolve) => {
            WSServer.on('connection', (socket) => {
                WSServerClient = socket;
                socket.on('message', (message) => {
                    message.sendNoReply({ isEvent: false, data: message.data });
                });
                expect(socket).toBeDefined();
                resolve();
            });
        });

        WSClient = await AsyncSocketWSClient(new WebSocket('ws://localhost:52000'));
        const response = await WSClient.send<{ test: boolean }>({ test: true });
        WSClient.sendNoReply({ test: true });
        await connectionPromise;
    });

    it('should send and receive a message', async () => {
        const response = await WSClient.send<{ test: boolean }>({ test: true });
        expect(response.data.test).toBe(true);

        const response2 = await WSClient.send<{ test: string }>({ test: 'text' });
        expect(response2.data.test).toBe('text');
    });

    it('should send and receive a emit s => c', async () => {
        WSClient.on('sc', (message) => {
            expect((message.data as { test: boolean }).test).toBe(true);
        });
        WSServerClient.sendEmit('sc', { test: true });
    });

    it('should send and receive a emit c => s', async () => {
        WSServerClient.on('cs', (message) => {
            expect((message.data as { test: boolean }).test).toBe(true);
        });
        WSClient.sendEmit('cs', { test: true });

        WSClient.on('anyMessage', (message) => {
            expect(message.data.test).toBe(true);
        });
    });
});
