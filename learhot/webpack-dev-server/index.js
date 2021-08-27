const webpack = require('webpack');
// webpack配置
const config = require('../webpack.config.js');
// 执行webpack拿到compiler，webpack编译器
const compiler = webpack(config);
const Server = require('./lib/server/Server');
// 写一个服务，把compiler传给它
const server = new Server(compiler);
// 监听服务
server.listen(9090,'127.0.0.1', () => {
    console.log('server is running on 9090')
});