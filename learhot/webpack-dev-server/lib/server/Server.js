
const express = require('express');
const http = require('http');
const updateCompiler = require('../utils/updateCompiler');
// const MemoryFs = require('memory-fs');
const mime = require('mime');
const path = require('path');
// 原来用的是内存文件系统，暂时先改成硬盘文件系统，因为放内存看不到真实的文件
const fs = require('fs-extra');
fs.join = path.join;
const socketIO = require('socket.io');
class Server {
    constructor(compiler) {
        this.compiler = compiler; //保存编译对象
        updateCompiler(compiler);
        // 开启一个http服务器
        this.setupApp(); // 创建app
        this.currentHash; // 当前的hash值,每次编译都会产生一个hash值
        this.clientSocketList = []; //存放所有通过websocket连接到服务器的客户端
        this.setupHooks(); // 建立钩子,监听compiler.hooks.done的回调
        this.setupDevMiddleware();
        this.routes(); //配置路由
        this.createServer(); //创建http服务器，以app作为路由
        this.createSocketServer();//创建socket服务器
        // 为什么起两个服务？
        // 一个服务是响应静态文件的createServer
        // 一个服务是用于消息通信的createSocketServer
    }
    createSocketServer() {
        // websocket协议握手是要依赖于http协议的
        const io = socketIO(this.server);
        // 服务器监听客户端的连接，当客户端连接上来后socket代表跟这个客户端连接对象
        io.on('connection',(socket)=>{
            console.log('一个新的客户端连接上来了');
            this.clientSocketList.push(socket);
            socket.emit('hash',this.currentHash); //把最新的hash值发送给客户端
            socket.emit('ok');
            //如果此客户端断开连接了，要把这个客户端从数组中删除
            socket.on('disconnect', () => {
                let index = this.clientSocketList.indexOf(socket);
                this.clientSocketList.splice(index,1);

            })
        })
    }
    setupApp() {
        this.app = express(); // 执行express函数得到this.app代表http应用对象
    }
    createServer() {
        // 通过http模块创建一个普通的http服务器
        // this.app是一个路由中间件
        this.server = http.createServer(this.app);
    }
    listen(port,host,callback) {
        this.server.listen(port,host,callback);
    }
    setupHooks() {
        let {compiler} = this;
        // 监听编译完成事件，当编译完成之后会调用这个钩子函数
        compiler.hooks.done.tap('webpack-dev-server',(stats)=> {
            // stat 是一个描述对象，存放打包后的结果，比如hash,chunkHash，产生了哪些代码块等等等
            console.log('hash',stats.hash);
            this.currentHash = stats.hash;
            // 每当编译成功以后，会向所用客户端进行广播，告诉客户端已经编译成功，新的模块代码已经生成了，快来拉我的新代码
            this.clientSocketList.forEach(socket => {
                socket.emit('hash',this.currentHash); //把最新的hash值发给客户端
                socket.emit('ok'); // 给客户端发一个ok
            })
        })
    }
    setupDevMiddleware() {
        this.middleware = this.webpackDevMiddleware(); // 返回一个express中间件
    }
    webpackDevMiddleware() {
        let {compiler} = this;
        //以监听模式启动编译，如果以后模块代码发生变化会重新编译，把编译结果输出到文件系统里，然后触发done的回调，通过socket发送hash和ok给客户端
        compiler.watch({},()=> {
            console.log('监听模式编译成功');
        });
        // let fs = new MemoryFs(); //内存文件系统实例
        // 以后打包后的文件写入内存文件系统，读的时候也要从内存文件系统中读取
        this.fs = compiler.outputFileSystem = fs;
        //返回一个中间件，用来响应客户端对于编译后产出文件的请求
        return (staticDir) => {//静态文件根目录，它就是dist目录
            return (req,res,next) => {
                let {url} = req;//得到请求路径
                if (url === '/favicon.ico') {
                    return res.sendStatus(404);
                }
                url === '/' ? url = '/index.html' : null;
                //得到要访问的静态路径 /index.html /main.js
                let filePath = path.join(staticDir,url);
                console.log('filePath',filePath); // /Users/zhouyang/projects/learhot/dist/index.html
                try {
                    // 返回此路径上的描述对象,如果此文件不存在会抛出异常
                    let statObj = this.fs.statSync(filePath);
                    console.log('statObj',statObj);
                    if(statObj.isFile()) {
                        let content = this.fs.readFileSync(filePath);// 读取文件内容
                        console.log('content',content);
                        res.setHeader('Content-Type',mime.lookup(filePath));//设置响应头，告诉浏览器此文件内容是什么
                        res.send(content);//把内容发送给浏览器
                    } else {
                        return res.sendStatus(404);
                    }
                }catch(error) {
                    console.log('error',error);
                    return res.sendStatus(404);
                }
            }

        }
    }
    routes() {
        let {compiler} = this;
        let config = compiler.options;
        this.app.use(this.middleware(config.output.path));
    }
}

module.exports = Server;