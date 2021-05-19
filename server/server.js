// server.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-19
//
// Base server class
/*
globals
Buffer, require
*/
'use strict';

let {Assign, Clear, Keys, LS, Stringify} = require('./common.js'),
    {check_request, read_post, send_response} = require('./common-server.js'),
    fs = require('fs'),
    path = require('path'),
    uWS = require('uWebSockets.js');

// custom vars
let DEV = {},
    DEV_TESTS = {},
    NO_REPLIES = {
        user_unsubscribe: 1,
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
     * @param {Array<string>} messages
     */
    constructor(messages) {
        this.app = null;
        this.default_section = 'home';
        this.guests = {};
        this.host = '';                         // https://tcec-chess.com/
        this.index_dir = '';
        this.name = '';                         // TCEC
        this.server_dir = '';
        this.subscribes = [];

        this.message_array = messages;
        this.message_dico = Assign({}, ...Keys(messages).map((key, id) => [{[key]: id[key]}]));
    }

    /**
     * Initialise the server
     * @param {Object} obj
     * @param {Object=} obj.dev {start:1, url:1}
     * @param {string} obj.dirname absolute server directory
     * @param {string=} obj.home relative home directory for index.html
     * @param {string=} obj.host https://tcec-chess.com
     * @param {string=} obj.name
     * @param {Array<string>=} obj.subscribes automatic subscriptions
     */
    async initialise({dev, dirname, home, host='', name, subscribes=[]}={}) {
        // home dir
        let parent = path.dirname(dirname),
            folder = path.join(parent, home);
        if (fs.existsSync(folder))
            this.index_dir = folder;
        else {
            this.index_dir = parent;
            Assign(DEV, DEV_TESTS);
        }
        this.server_dir = dirname;

        if (dev) {
            Clear(DEV);
            Assign(DEV, dev);
        }
        if (DEV.start) {
            LS(this.server_dir, ':', this.index_dir);
            LS(DEV);
        }

        this.host = host;
        this.name = name;
        this.subscribes = subscribes;

        // custom
        await this.initialise_after();
    }

    /**
     * Extra initialisation steps
     */
    async initialise_after() {
        if (DEV.virtual)
            LS('initialise_after');
    }

    // HELPERS
    //////////

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
     * @param {WebSocket} socket
     * @returns {Array<Object>|undefined}
     */
    async user_subscribe(query, socket) {
        if (!socket)
            return;

        if (query.clear)
            this.user_unsubscribe(null, socket);

        let channels = query.channels || [];
        for (let channel of channels)
            socket.subscribe(channel);

        return channels;
    }

    /**
     * User unsubscribe
     * @param {Object} _query
     * @param {WebSocket} socket
     */
    async user_unsubscribe(_query, socket) {
        if (!socket)
            return;
        socket.unsubscribeAll();

        // default subscriptions
        for (let subscribe of this.subscribes)
            socket.subscribe(subscribe);
    }

    // SERVER
    /////////

    /**
     * Handle any request, JSON or DATA
     * @param {string} type api, up
     * @param {Request} req
     * @param {Response} res
     */
    async handle_request(type, req, res) {
        // 0) build the query
        let json;
        if (type == 'api')
            json = req.body;
        else {
            json = req.query;
            json.data = req.body;
        }

        // 1) check if valid
        let invalid = false,
            key = json[0],
            method = this.message_array[key],
            query = json[1] || {};

        if (!method || !this[method]) {
            if (DEV.url)
                LS(`unknown method: ${key}/${method}`, json);
            send_response(res, [-1, 0, {key: key, method: method}]);
            return;
        }

        // 2) dispatch the message
        query.ip = req.headers['x-real-ip'];
        let data, err;
        try {
            data = await this[method](query);
        }
        catch (e) {
            err = e;
        }

        // no reply needed?
        if (NO_REPLIES[method]) {
            send_response(res, []);
            return;
        }

        // 3) assemble the result
        let result = [key, data];
        if (err)
            result.push(err);

        if (invalid) {
            if (DEV.user)
                LS('invalid session => result.logout');
            result[3] = invalid;
        }

        // 5) send the response
        send_response(res, result);
    }

    /**
     * Handle a socket message
     * @param {WebSocket} socket
     * @param {!Object} json [key, query]
     */
    async handle_socket(socket, json) {
        // 1) check if valid
        let invalid = false,
            key = json[0],
            method = this.message_array[key],
            query = json[1] || {};

        if (!method || !this[method]) {
            if (DEV.url)
                LS(`unknown method: ${key}/${method}`, json);
            return;
        }

        // 2) dispatch the message
        let data, err;
        try {
            data = await this[method](query, socket);
        }
        catch (e) {
            err = e;
        }

        // no reply needed?
        if (NO_REPLIES[method] || socket.dead)
            return;

        // 3) assemble the result
        let result = [key, data];
        if (err)
            result.push(err);

        if (invalid) {
            if (DEV.user)
                LS('invalid session => result.logout');
            result[3] = invalid;
        }

        // 4) send the response
        // - socket might be invalid
        try {
            socket.send(Stringify(result));
        }
        catch (e) {
            LS('handle_socket_error:', socket.id);
        }
    }

    /**
     * Opened a websocket
     * @param {!Object} socket
     */
    async opened_socket(socket) {
    }

    /**
     * Start the server:
     * + listen on port 3000
     * + receive the messages
     */
    start_server() {
        this.app = uWS.App()
        .ws('/api/*', {
            close: socket => {
                LS('closed socket:', socket.id);
                socket.dead = true;
            },
            message: async (socket, message, _is_binary) => {
                let vector = new Uint8Array(message);
                if (vector[0] == 0)
                    socket.send(message, true);
                else {
                    let json,
                        buffer = Buffer.from(message);
                    if (DEV.ws)
                        LS(buffer.toString());

                    try {
                        json = JSON.parse(buffer.toString());
                    }
                    catch (e) {
                        LS(e);
                    }
                    if (json) {
                        await this.handle_socket(socket, json);
                        if (DEV.ws)
                            LS(json);
                    }
                }
            },
            open: async socket => {
                LS('opened socket');
                socket.id = socket_id ++;
                await this.opened_socket(socket);
            },
        })
        .get('/api/*', async (res, req) => {
            check_request(req);
            req.body = req.query;
            res.onAborted(() => {
                res.aborted = true;
                LS('get aborted');
            });
            await this.handle_request('api', req, res);
        })
        .post('/api/*', (res, req) => {
            check_request(req);
            read_post(res, true, async json => {
                req.body = json;
                await this.handle_request('api', req, res);
            });
        })
        .post('/up/*', (res, req) => {
            check_request(req);
            read_post(res, false, async data => {
                req.body = data;
                await this.handle_request('up', req, res);
            });
        })
        .get('/*', (res, _req) => {
            res.end('Nothing to see here!!');
        })
        .listen(3000, token => {
            if (DEV.start)
                LS(`listening on port 3000${token? '': ' ERROR'}`);
        });
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// exports
/* globals module */
// <<
module.exports = {
    DEV_TESTS: DEV_TESTS,
    NO_REPLIES: NO_REPLIES,
    Server: Server,
};
