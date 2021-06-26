// server.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-06-25
//
// Base server class
// jshint -W069
/*
globals
Buffer, require
*/
'use strict';

let {Assign, Clear, Keys, IsArray, IsString, LS, ParseJSON, Stringify} = require('./common.js'),
    {checkRequest, readPost, sendResponse} = require('./common-server.js'),
    fs = require('fs'),
    path = require('path'),
    uWS = require('uWebSockets.js');

// custom vars
let BACKPRESSURE = 16384,
    DEV = {},
    DEV_TESTS = {
        error: 0,
        start: 0,
        subscribe: 0,
        url: 0,
        user: 0,
        ws: 0,
        ws2: 0,
        virtual: 0,
    },
    NO_REPLIES = {
        user_unsubscribe: 1,
    },
    NO_SESSIONS = {
    },
    socket_id = 1;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * A query
 * @typedef {Object} Query
 * @property {string} email email
 * @property {Object} find {key: value, ...}
 * @property {number} limit limit the number of results
 * @property {string} session session id
 * @property {number} skip skip a number of results
 */

class Server {
    /**
     * Creates an instance of Server
     * @constructor
     * @param {Object<string, number>} messages
     */
    constructor(messages) {
        this.app = null;
        this.cache_size = 16 * 1024 * 1024;
        this.default_section = 'home';
        this.guests = {};
        this.home = '';
        this.host = '';                         // https://tcec-chess.com/
        this.index_dir = '';
        this.name = '';                         // TCEC
        this.num_socket = 0;
        this.port = 3000;
        this.server_dir = '';
        this.subscribes = new Set();

        this.message_codes = messages;
        this.message_methods = Assign({}, ...Keys(messages).map(key => ({[messages[key]]: key})));
    }

    /**
     * Initialise the server
     * @param {Object} obj
     * @param {number=} cache_size
     * @param {Object=} obj.dev {start:1, url:1}
     * @param {string} obj.dirname absolute server directory
     * @param {string=} obj.home relative home directory for index.html
     * @param {string=} obj.host https://tcec-chess.com
     * @param {string=} obj.name name for the email
     * @param {number=} obj.port
     * @param {Array<string>=} obj.subscribes automatic subscriptions
     * @param {Object=} obj.ws_options
     */
    async initialise({
            cache_size, dev, dirname, home, host='', name, port, subscribes=[], ws_options={},
        }={}) {
        // home dir
        let parent = path.dirname(dirname),
            folder = path.join(parent, home);
        if (fs.existsSync(folder))
            this.index_dir = folder;
        else
            this.index_dir = parent;
        this.home = home;
        this.server_dir = dirname;

        if (!DEV_TESTS.silent)
            Assign(DEV, DEV_TESTS);

        if (dev) {
            Clear(DEV);
            Assign(DEV, dev);
        }
        if (DEV.start) {
            LS(this.server_dir, ':', this.index_dir);
            LS(DEV);
        }

        if (cache_size !== undefined)
            this.cache_size = cache_size;
        this.host = host;
        this.name = name;
        if (port)
            this.port = port;
        this.subscribes = new Set(subscribes);
        this.ws_options = ws_options;

        // custom
        await this.initialiseAfter();
    }

    /**
     * Extra initialisation steps
     */
    async initialiseAfter() {
        if (DEV.virtual)
            LS('initialiseAfter');
    }

    // HELPERS
    //////////

    /**
     * Publish a message shortcut
     * @param {string} channel
     * @param {string} key
     * @param {string} value
     */
    publish(channel, key, value) {
        this.app.publish(channel, Stringify([key, value]), false, true);
    }

    // IP
    /////

    /**
     * Get the remote IP
     * @param {Query} query
     * @returns {string} ip
     */
    ip_get(query) {
        return query.ip;
    }

    // USER
    ///////

    /**
     * User subscription
     * @param {Object} query
     * @param {uWS.WebSocket} socket
     * @returns {Array<Object>|undefined}
     */
    async user_subscribe(query, socket) {
        if (!socket)
            return;

        if (query.clear)
            this.user_unsubscribe(null, socket);

        let channels = query.channels || [],
            topics = new Set(socket.getTopics());
        for (let channel of channels)
            if (!topics.has(channel))
                socket.subscribe(channel);

        if (DEV.subscribe)
            LS('topics=', socket.getTopics());
        return channels;
    }

    /**
     * User unsubscribe
     * @param {Object} _query
     * @param {uWS.WebSocket} socket
     */
    async user_unsubscribe(_query, socket) {
        if (!socket)
            return;

        let topics = new Set(socket.getTopics());
        for (let topic of topics)
            if (!this.subscribes.has(topic))
                socket.unsubscribe(topic);

        // default subscriptions
        for (let subscribe of this.subscribes)
            if (!topics.has(subscribe))
                socket.subscribe(subscribe);
    }

    // SERVER
    /////////

    /**
     * Handle any request, JSON or DATA
     * @param {string} type api, up
     * @param {uWS.HttpRequest} req
     * @param {uWS.HttpResponse} res
     */
    async handleRequest(type, req, res) {
        // 0) build the query
        let json;
        if (type == 'api')
            json = req.body;
        else {
            json = req.query;
            json.data = req.body;
        }

        let key, query;
        if (IsArray(json)) {
            key = json[0];
            query = json[1];
        }
        else if (IsString(json)) {
            let pos = json.indexOf(' ');
            if (pos > 0) {
                key = parseInt(json.slice(0, pos));
                query = json.slice(pos + 1);
            }
            else
                key = parseInt(json);

            if (isNaN(key)) {
                sendResponse(res, [-1, 0, {}]);
                return;
            }
        }
        else {
            key = json.key;
            query = json;
        }

        // 1) check if valid
        let invalid = false,
            method = this.message_methods[key],
            no_session = NO_SESSIONS[method];

        if (!method || !this[method]) {
            if (DEV.url)
                LS(`unknown method: ${key}/${method}`, json);
            sendResponse(res, [-1, 0, {key: key, method: method}]);
            return;
        }

        query = query || {};
        query.ip = req.headers['x-real-ip'];

        // 2) need session?
        if (!no_session) {
        }

        // 3) dispatch the message
        let data, err;
        try {
            data = await this[method](query);
        }
        catch (e) {
            err = e;
            if (DEV.error)
                LS(err);
        }

        // no reply needed?
        if (NO_REPLIES[method]) {
            sendResponse(res, []);
            return;
        }

        // 4) assemble the result: [key, data, error, invalid=logout]
        let result = [key, data];
        if (err)
            result.push(err);

        if (invalid) {
            if (DEV.user)
                LS('invalid session => result.logout');
            result[3] = invalid;
        }

        // 5) send the response
        sendResponse(res, result);
    }

    /**
     * Handle a socket message
     * @param {uWS.WebSocket} socket
     * @param {Object|string=} key could be a [key, query] itself
     * @param {Object|string=} query
     */
    async handleSocket(socket, key, query) {
        // 1) check if valid
        if (!query && IsArray(key)) {
            query = key[1] || {};
            key = key[0];
        }

        let invalid = false,
            method = this.message_methods[key],
            no_session = NO_SESSIONS[method];

        if (!method || !this[method]) {
            if (DEV.url)
                LS(`handleSocket__unknown: ${key}/${method}`, key, query);
            return;
        }

        // 2) need session?
        if (!no_session) {
        }

        // 3) dispatch the message
        let data, err;
        try {
            data = await this[method](query, socket);
        }
        catch (e) {
            err = e;
            if (DEV.error)
                LS(err);
        }

        // no reply needed?
        if (NO_REPLIES[method] || socket.dead)
            return;

        // 4) assemble the result: [key, data, error, invalid=logout]
        let result = [key, data];
        if (err)
            result.push(err);

        if (invalid) {
            if (DEV.user)
                LS('invalid session => result.logout');
            result[3] = invalid;
        }

        // 5) send the response
        // - socket might be invalid
        try {
            socket.send(Stringify(result));
        }
        catch (e) {
            LS('handleSocket_error:', socket.id);
        }
    }

    /**
     * Opened a websocket
     * @param {uWS.WebSocket} socket
     */
    async openedSocket(socket) {
    }

    /**
     * Start the server:
     * + listen on port 3000
     * + receive the messages
     */
    startServer() {
        this.app = uWS.App()
        .ws('/api/*', Assign({}, this.ws_options, {
            open: async socket => {
                this.num_socket ++;
                if (DEV.ws)
                    LS('opened socket', socket_id, '/', this.num_socket);
                socket.id = socket_id ++;
                await this.openedSocket(socket);
            },
            message: async (socket, message, is_binary) => {
                // a) binary
                if (is_binary) {
                    let vector = new Uint8Array(message);
                    if (vector.length == 1)
                        socket.send(message, true);
                }
                else {
                    let key, query,
                        buffer = Buffer.from(message);
                    if (DEV.ws2)
                        LS(buffer.toString());

                    // b) array: [5, "data is here"]
                    let text = buffer.toString();
                    if (text[0] == '[') {
                        let json = ParseJSON(text);
                        if (json) {
                            key = json[0];
                            query = json[1];
                        }
                    }
                    // c) string: "5 data is here"
                    else {
                        let pos = text.find(' ');
                        if (pos > 0) {
                            key = parseInt(text.slice(0, pos));
                            query = text.slice(pos + 1);
                        }
                        else
                            key = parseInt(text);

                        if (isNaN(key))
                            return;
                    }

                    if (key) {
                        await this.handleSocket(socket, key, query);
                        if (DEV.ws2)
                            LS(key, query);
                    }
                }
            },
            drain: socket => {
                LS('drain:', socket.getBufferedAmount(), BACKPRESSURE);
            },
            close: socket => {
                this.num_socket --;
                if (DEV.ws)
                    LS('closed socket:', socket.id, '/', this.num_socket);
                socket.dead = true;
            },
        }))
        .get('/api/*', async (res, req) => {
            checkRequest(req);
            req.body = req.query;
            await this.handleRequest('api', req, res);
        })
        .post('/api/*', async (res, req) => {
            checkRequest(req);
            try {
                let data = await readPost(res);
                req.body = ParseJSON(data);
                await this.handleRequest('api', req, res);
            }
            catch (e) {
                LS(e);
                sendResponse(res, [-1, {}, e]);
            }
        })
        .post('/up/*', async (res, req) => {
            checkRequest(req);
            try {
                let data = await readPost(res);
                req.body = data;
                await this.handleRequest('up', req, res);
            }
            catch (e) {
                LS(e);
                sendResponse(res, [-1, {}, e]);
            }
        })
        .get('/*', (res, _req) => {
            res.end('Nothing to see here!!');
        })
        .listen(this.port, token => {
            if (DEV.start)
                LS(`listening on port ${this.port}${token? '': ' ERROR'}`);
        });
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// exports
/* globals module */
// <<
module.exports = {
    DEV: DEV,
    DEV_TESTS: DEV_TESTS,
    NO_REPLIES: NO_REPLIES,
    NO_SESSIONS: NO_SESSIONS,
    Server: Server,
};
