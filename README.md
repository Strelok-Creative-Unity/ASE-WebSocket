# AsyncSocketEngine - WebSocket

[AsyncSocket](https://github.com/strelok-js/AsyncSocket/tree/main) - это библиотека, которая предоставляет логику для асинхронного обмена сообщениями через сокетные соединения. Этот движок построен на базе WebSocket и реализует интерфейс AsyncSocket для него.

## Примеры использования

### Серверная часть

```javascript
// Требуется WebSocket.Server или настройки для WebSocket.Server
const wss = AsyncSocketWSServer({ port: 52000 });

wss.on('connection', (wsc) => {
    console.log('New connect');

    wsc.on('message', (mess) => {
        if (mess.data.testReply) return mess.reply({ message: 'Great' });
        else console.log(mess);
    });
});
```

### Клиентская часть

```javascript
const wsc = await AsyncSocketWSClient(new WebSocket('ws://localhost:52000'));

wsc.on('message', console.log); // Не будет залогирован, т.к. ответ Great ожидается
const message = await wsc.send({ testReply: true });
console.log(message.data.message); //=> "Great"
```

### Работа с событиями

```javascript
// Сервер отправляет события
wss.on('connection', (wsc) => {
    console.log('New connect');

    setInterval(() => {
        wsc.sendEmit('interval', { message: 'Great' });
    }, 5000);
});
```

```javascript
// Клиент слушает события
wsc.on('interval', (message) => console.log(message.data.message)); //=> "Great" Every 5 seconds
```
