// 打包后的文件main.js在浏览器中能运行的原理，从0实现客户端初次渲染逻辑，就是webpack打包出来的代码是怎么在浏览器中运行起来的
let currentHash;
let lastHash;
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
(function(modules) {
    // webpack打包过后的模块是commonjs,浏览器不能直接使用，所以webpack自己实现一套require规范可以在浏览器中运行
    var installedModules = {}; // 存放模块缓存
    function hotCheck() {
        debugger;
        //update => {"h":"06db98ff124bee7085e8","c":{"main":true}}
        hotDownloadManifest().then(update=> { //获取哪些模块代码更新了
            let chunkIds = Object.keys(update.c); //['main']
            chunkIds.forEach(chunkId => {
                hotDownloadUpdateChunk(chunkId); //下载更新后的代码
            });
            lastHash=currentHash;
        }).catch(()=> {
            window.location.reload();
        })
    }
    function hotDownloadUpdateChunk(chunkId) {
        // 使用jsonp请求更新后的代码,main.4c3be4e5db32f675e187.hot-update.js
        let script = document.createElement('script');
        script.src=`${chunkId}.${lastHash}.hot-update.js`;
        document.head.appendChild(script);
    }
    window.webpackHotUpdate=function(chunkId,moreModules){
        hotAddUpdateChunk(chunkId,moreModules);
    }
    let hotUpdate={};
    function hotAddUpdateChunk(chunkId,moreModules) {
        for(let moduleId in moreModules) {
            // 新的函数覆盖老的函数
            modules[moduleId]=hotUpdate[moduleId]=moreModules[moduleId];
        }
        hotApply();
    }
    function hotApply() {
        for(let moduleId in hotUpdate) { //例如title.js代码更新了，那么moduleId=>'.src/title.js'
            let oldModule=installedModules[moduleId];//老的title.js模块
            delete installedModules[moduleId];//从模块缓存中删除老模块
            //循环所有的父模块，取出父模块上的回调执行
            oldModule.parents.forEach(parentModule=>{
                let cb = parentModule.hot._acceptDependencies[moduleId];
                cb&&cb();
            })
        }
    }
    function hotDownloadManifest() {
        return new Promise(function(resolve,reject) {
            let xhr = new XMLHttpRequest();
            let url = `${lastHash}.hot-update.json`;
            xhr.open('get',url);
            xhr.responseType='json';
            xhr.onload=function() {
                resolve(xhr.response);
            }
            xhr.send();
        })
    }
    function hotCreateModule() {
        let hot = {
            _acceptDependencies: {},
            /**
             * 
             * if (module.hot) {
                    module.hot.accept(['./title.js'],render);
                }
             */
            accept(deps,callback) {
                //hot._acceptDependencies['./title.js]=render;
                deps.forEach(dep => {
                    hot._acceptDependencies[dep] = callback;
                });
            },
            check:hotCheck
        };
        return hot;
    }
    // parentModuleId父模块id
    // hotCreateRequire是对__webpack_require__的封装，加了维护父子关系的逻辑
    function hotCreateRequire(parentModuleId) { //parentModuleId = .src/index.js
        //因为要加载子模块的时候，父模块肯定已经加载好了，可以从缓存中通过parentModuleId拿到父模块对象
        let parentModule = installedModules[parentModuleId];//.src/index.js的模块对象
        //如果缓存里没有此模块对象，说明这是一个顶级模块，没有父亲
        if(!parentModule) return __webpack_require__;
        let hotRequire = function(childModuleId) { //childModuleId = .src/title.js
            __webpack_require__(childModuleId);// 加载子模块,会把子模块对象放在缓存中
            let childModule = installedModules[childModuleId];// 取出子模块对象
            childModule.parents.push(parentModule);
            parentModule.children.push(childModule); //把此模块Id添加到父模块对象的children中
            console.log('childModule',childModule);
            return childModule.exports; // 返回子模块的导出对象
        }
        return hotRequire;
    }
    function __webpack_require__(moduleId) {
       if (installedModules[moduleId]) { // 如果缓存中有模块id了直接返回
           return installedModules[moduleId];
       }
       let module = installedModules[moduleId] = {// 创建一个新的模块对象并且放入缓存
           i: moduleId, // 模块id
           l: false, //是否已经加载
           exports: {},// 导出对象
           parents: [], //当前模块的父亲
           hot: hotCreateModule(),
           children: [], //当前模块的孩子
       }
       modules[moduleId].call(module.exports,module,module.exports,hotCreateRequire(moduleId));// 执行对应模块的函数，这样以后浏览器拿到的代码就没有require了，就能运行了
       module.l=true; //表示已经加载过此模块了
       return module.exports;
   }
   __webpack_require__.c=installedModules;
   return hotCreateRequire('./src/index.js')('./src/index.js');
})({
    "./src/index.js": function(module,exports,__webpack_require__) {
        // 监听webpackHotUpdate消息
        __webpack_require__('webpack/hot/dev-server.js');
        //连接websocket服务器，如果服务器发给我hash我就保存currentHash里，如果服务器发送ok，我就发射监听webpackHotUpdate事件
        __webpack_require__('webpack-dev-server/client/index.js');
        let input = document.createElement('input');
        document.body.appendChild(input);
        let div = document.createElement('div');
        document.body.appendChild(div);
        let render = ()=> {
            let title = __webpack_require__('./src/title.js'); //用__webpack_require__替换require
            div.innerHTML = title;
        }
        render();
        if (module.hot) {
            module.hot.accept(['./src/title.js'],render);
        }
    },
    "./src/title.js": function(module,exports) {
        module.exports = 'title';
    },
    "webpack-dev-server/client/index.js": function(module,exports) {
        // 客户端连接websocket服务器
        // /socket.io/socket.io.js返回之后会给window.io赋值，通过它就可以连接到websocket服务器
        const socket = window.io('/');
        // 客户端监听服务器发送过来的hash事件，保存此哈希值
        socket.on('hash',(hash)=>{
            console.log('hash',hash);
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
    },
    "webpack/hot/dev-server.js": function(module,exports) {
        /**
         * 存二个hash值，一个是上一个hash，一个是当前的hash
         */
        hotEmitter.on('webpackHotUpdate',() => {
            if(!lastHash) {//如果没有lastHash说明没有上一次的编译结果，说明就是第一次渲染
                lastHash=currentHash;
                console.log('lastHash',lastHash);
                console.log('currentHash',currentHash);
                return;
            }
            console.log('lastHash',lastHash);
            console.log('currentHash',currentHash);
            //调用hot.check方法向服务器检查更新并拉取最新代码
            module.hot.check();
        })
    }
})