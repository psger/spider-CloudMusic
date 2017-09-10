const singerConfig = require('./singer');
const database =  require('./mysql');
//const songConfig = require('./song');
module.exports = {//module.exports用来导出代码
	singerConfig,
	database
}