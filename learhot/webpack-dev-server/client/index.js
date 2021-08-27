// 客户端连接websocket服务器
// /socket.io/socket.io.js返回之后会给window.io赋值，通过它就可以连接到websocket服务器
let currentHash;
class EventEmitter {
    constructor() {
        this.events = {};
    }
    on(eventName,fn) {
        this.events[eventName] = fn;
    }
    emit(eventName,...args) {
        this.events[eventName](...args);
    }
}
let hotEmitter = new EventEmitter();
const socket = window.io('/');
// 客户端监听服务器发送过来的hash事件，保存此哈希值
socket.on('hash',(hash)=>{
    currentHash=hash;
});
// 客户端监听服务器发送过来的ok事件,执行reloadApp方法进行更新
socket.on('ok',()=>{
    console.log('ok');
    reloadApp();
})
// reloadApp会发送一个webpackHotUpdate事件,webpack/hot/dev-server.js会去监听这个事件
function reloadApp() {
    hotEmitter.emit('webpackHotUpdate');
}