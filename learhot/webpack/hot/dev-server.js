/**
 * 存二个hash值，一个是上一个hash，一个是当前的hash
 * 第一次编译的时候客户端的代码和服务端的代码是一致的，都是hash1
 * 代码发生改变，当服务器重新编译的时候，会重新得到一个hash值hash2。还会创建一个hash1的补丁包，4c3be4e5db32f675e187.hot-update.json文件，其内容{"h":"06db98ff124bee7085e8","c":{"main":true}}包里会说明hash1到hash2哪些代码块main发生了变更，main.4c3be4e5db32f675e187.hot-update.js说明发生了哪些变更。内容如下
 * webpackHotUpdate("main",{
 "./src/title.js":
(function(module, exports) {

module.exports="title1";
})

})
 * 以便客户端通过热更新的方式去拉去新的代码，用上一次hash值去发起请求
 */
let lastHash;
hotEmitter.on('webpackHotUpdate',() => {
    console.log('hotcheck');
})