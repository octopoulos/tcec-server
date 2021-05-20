// hostel.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-19
//
/*
globals
__dirname, Buffer, require, setInterval
*/
'use strict';

let {Assign, LS} = require('./common.js'),
    fs = require('fs'),
    fsa = fs.promises,
    {MESSAGES, VERSION} = require('./global.js'),
    path = require('path'),
    {DEV_TESTS, Server} = require('./server.js');

// custom vars
let TIMEOUT_retry = 3007,
    WATCH_FAST = 1007,
    WATCH_FASTER = 107,
    WATCH_SLOW = 5007;

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

/** @class */
class TCEC extends Server {
    /**
     * Creates an instance of TCEC
     * @param {Object} obj
     * @param {Array<string>} obj.fasts files to watch frequently
     * @param {Array<string>} obj.live_log cute log file, must be watched in real time
     * @param {Array<string>} obj.live_pgn live pgn, must be watched in real time
     * @param {Array<string>} obj.live_prefix prefix added before live_log and live_pgn
     * @param {Array<string>} obj.slows files to watch slowly
     * @constructor
     */
    constructor({fasts, live_log='live.log', live_pgn='live.pgn', live_prefix='./', slows}={}) {
        super(MESSAGES);

        this.fasts = fasts || [];
        this.live_log = path.join(live_prefix, live_log);
        this.live_pgn = path.join(live_prefix, live_pgn);
        this.slows = slows || [];

        LS(this.live_log);
        LS(this.live_pgn);

        this.watchers = [null, null];

        Assign(DEV_TESTS, {
            start: 1,
            url: 1,
            user: 1,
            ws: 1,
        });

        LS(`TCEC server ${VERSION}`);
    }

    /**
     * Close a watcher
     * @param {number} id
     */
    closeWatcher(id) {
        let watcher = this.watchers[id];
        if (watcher) {
            LS('close', id, watcher);
            if (watcher.close)
                watcher.close();

            this.watchers[id] = null;
        }
    }

    /**
     * Run extra commands
     */
    async initialise_after() {
        await this.watchFiles();
    }

    /**
     * Watch a file continuously even if it doesn't exist
     * @param {number} id
     * @param {string} filename
     * @param {Function} callback
     * @param {number} interval
     */
    watchContinuous(id, filename, callback, interval) {
        this.closeWatcher(id);

        setInterval(async () => {
            if (this.watchers[id])
                return;

            await this.watchFile(id, filename, callback, interval);
        }, TIMEOUT_retry);
    }

    /**
     * Utility to watch one file
     * @param {number} id
     * @param {string} filename
     * @param {Function} callback
     * @param {number} interval
     * @param {Function=} method fs.watch, fs.watchFile
     */
    async watchFile(id, filename, callback, interval=5007, method=fs.watchFile) {
        LS('watchFile', id, filename);
        this.closeWatcher(id);

        // 1) open file
        let fin;
        try {
            fin = await fsa.open(filename, 'r');
        }
        catch (e) {
            LS('watchFile__fin_error', e);
            return;
        }

        // 2) start watching
        let bufsize = 4096,
            buffer = new Buffer.alloc(bufsize),
            prev_size = 0;

        try {
            this.watchers[id] = method(filename, {interval: interval}, async () => {
                // 3) get file size
                let stat;
                try {
                    stat = await fsa.stat(filename);
                }
                catch (e) {
                    LS('watchFile__stat_error', e);
                    this.closeWatcher(id);
                    await fin.close();
                    return;
                }

                let size = stat.size,
                    delta = size - prev_size;
                if (size < 1 || !delta)
                    return;

                // 4) read unread data
                while (1) {
                    let result;
                    try {
                        result = await fin.read(buffer, 0, bufsize);
                    }
                    catch (e) {
                        LS('watchFile__read_error', e);
                        await fin.close();
                        this.closeWatcher(id);
                        return;
                    }

                    let count = result.bytesRead;
                    if (!count)
                        break;
                    LS('text:', count, ':', result.buffer.slice(0, count).toString());
                }

                callback(prev_size, size);
                prev_size = size;
            });

            LS('watching', id, this.watchers[id]);
        }
        catch (e) {
            LS('watchFile__error', e);
            await fin.close();
            this.closeWatcher(id);
        }
    }

    /**
     * Watch the log + pgn files
     */
    async watchFiles() {
        // 1) real time stuff
        this.watchContinuous(0, this.live_pgn, (prev_size, size) => {
            LS('PGN: ', prev_size, '=>', size);
        }, WATCH_FASTER);

        this.watchContinuous(1, this.live_log, (prev_size, size) => {
            LS('LOG: ', prev_size, '=>', size);
        }, WATCH_FASTER);

        // 2) fast
        let id = 2;
        for (let fast of this.fasts) {
            this.watchContinuous(id, fast, (prev_size, size) => {
                LS('FAST: ', id, fast, prev_size, '=>', size);
            }, WATCH_FAST);
            id ++;
        }

        // 3) slow
        for (let slow of this.slows) {
            this.watchContinuous(id, slow, (prev_size, size) => {
                LS('SLOW: ', id, slow, prev_size, '=>', size);
            }, WATCH_SLOW);
            id ++;
        }

        LS('watching files ...');
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// exports
/* globals module */
// <<
module.exports = {
    TCEC: TCEC,
};
