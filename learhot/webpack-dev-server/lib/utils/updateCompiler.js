/**
 * 为了实现客户端跟服务端的通信，需要往入口里面多注入两个文件
 * (webpack)-dev-server/client/index.js
 * (webpack)/hot/dev-server.js
 * ./src/index.js
 * @param {*} compiler 
 */
const path = require('path');
function updateCompiler(compiler) {
    const config = compiler.options; // 就是webpack配置
    config.entry = {
        main: [
            path.resolve(__dirname,'../../client/index.js'),
            path.resolve(__dirname,'../../../webpack/hot/dev-server.js'),
            config.entry, //./src/index.js
        ]
    }
    console.log('enryt',config.entry);

}

module.exports = updateCompiler;