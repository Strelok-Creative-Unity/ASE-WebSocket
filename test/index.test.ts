import { AsyncSocket, AsyncSocketServer } from 'asyncsocket';
import { AsyncSocketWSClient, AsyncSocketWSServer, WebSocketEngine, WebSocketServerEngine, WSIncomingDataStore } from '../src/index';
import { WebSocket } from 'ws';

describe('WS Server + Client', () => {
    let WSClient: AsyncSocket;
    let WSServer: AsyncSocketServer;
    let WSServerClient: AsyncSocket;

    beforeAll(() => {
        WSServer = AsyncSocketWSServer({ port: 52000 });
    });

    afterAll(async () => {
        if (WSClient) {
            (WSClient.engine as WebSocketEngine).ws.close();
        }
        if (WSServer) {
            await new Promise<void>((resolve) => (WSServer.engine as WebSocketServerEngine).wss.close(() => resolve()));
        }
    });

    it('should establish a connection', async () => {
        const connectionPromise = new Promise<void>((resolve) => {
            WSServer.on('connection', (socket: AsyncSocket) => {
                WSServerClient = socket;
                socket.on('message', (message: WSIncomingDataStore) => {
                    message.sendNoReply({ test: true });
                });
                expect(socket).toBeDefined();
                resolve();
            });
        });

        WSClient = await AsyncSocketWSClient(new WebSocket('ws://localhost:52000'));
        await connectionPromise;
    });

    it('should send and receive a message', async () => {
        const response = await WSClient.send({ test: true });
        expect(response.test).toBe(true);
    });

    it('should send and receive a emit s => c', async () => {
        WSClient.on('sc', (message) => {
            expect(message.test).toBe(true);
        });
        WSServerClient.sendEmit('sc', { test: true });
    });

    it('should send and receive a emit c => s', async () => {
        WSServerClient.on('cs', (message) => {
            expect(message.test).toBe(true);
        });
        WSClient.sendEmit('cs', { test: true });
    });
});
