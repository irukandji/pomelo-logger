const log4js = require('log4js');
const fs = require('fs');
const util = require('util');
const path = require('path');

const info = {
    inited: false,
    pending: [],
    context: {}
};

function addContext(logger, fileName) {
    if (typeof fileName === 'string' && fileName.length > 0) {
        const appBase = path.dirname(require.main.filename);
        logger.addContext("file", path.relative(appBase, fileName));
    }

    for (let k in info.context) {
        if (!info.context.hasOwnProperty(k)) {
            continue;
        }
        logger.addContext(k, info.context[k]);
    }
}

function getLogger(categoryName, fileName) {
    const logger = log4js.getLogger(categoryName);
    addContext(logger, fileName);

    if (!info.inited) {
        // 还没有经历log4js configure就调用getLogger得到的实例需要收集起来, 在configure阶段补充context
        info.pending.push(logger);
    }
    return logger;
};

/**
 * Configure the logger.
 * Configure file just like log4js.json. And support ${scope:arg-name} format property setting.
 * It can replace the placeholder in runtime.
 * scope can be:
 *     env: environment variables, such as: env:PATH
 *     args: command line arguments, such as: args:1
 *     opts: key/value from opts argument of configure function
 *
 * @param  {String|Object} config configure file name or configure object
 * @param  {Object} opts   options
 * @return {Void}
 */

function configure(config, opts) {
    config = config || process.env.LOG4JS_CONFIG;
    opts = opts || {};

    if (typeof config === 'string') {
        config = JSON.parse(fs.readFileSync(config, "utf8"));
    }

    if (opts.app) {
        info.context['svrtype'] = opts.app.getServerType();
        info.context['svrid'] = opts.app.getServerId();
        const svrInfo = opts.app.getCurServer();
        info.context['mid'] = svrInfo['mid'] && typeof svrInfo['mid'] === 'number'? svrInfo['mid'] : 0;
    }
    log4js.configure(config);

    info.inited = true;
    for (let i = 0; i < info.pending.length; i++) {
        addContext(info.pending[i]);
    }
    info.pending = [];
};

module.exports = {
    getLogger: getLogger,
    configure: configure,
    shutdown: log4js.shutdown
};