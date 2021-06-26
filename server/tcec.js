// hostel.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-20
//
/*
globals
__dirname, Buffer, require
*/
'use strict';

let {Assign, Keys, LS, Min, Now, RandomInt, Stringify} = require('./common.js'),
    fs = require('fs'),
    fsa = fs.promises,
    {MESSAGES, MSG_CUSTOM_LOG, MSG_CUSTOM_PGN, MSG_USER_COUNT, VERSION} = require('./global.js'),
    path = require('path'),
    {DEV, DEV_TESTS, Server} = require('./server.js');

// custom vars
let ALIGN_BLOCK = 64,
    INTERVAL_RANDOM = 10,
    TYPE_ALIGN = 4,
    TYPE_CHANGE = 1,
    TYPE_CHANGE_ONLY = 2,
    TYPE_FAST = 8,
    TYPE_SLOW = 16,
    TYPE_SLOWER = 32,
    WATCH_FAST = 1000,
    WATCH_FASTER = 160,
    WATCH_FASTEST = 80,
    WATCH_SLOW = 5000,
    WATCH_SLOWER = 15000,
    WATCHES = {
        // faster
        pgn: [TYPE_CHANGE | TYPE_ALIGN, WATCH_FASTEST],
        log: [TYPE_CHANGE | TYPE_CHANGE_ONLY, WATCH_FASTER],

        // fast
        'data.json': [TYPE_FAST, WATCH_FAST],
        'data1.json': [TYPE_FAST, WATCH_FAST],
        'liveeval.json': [TYPE_FAST, WATCH_FAST],
        'liveeval1.json': [TYPE_FAST, WATCH_FAST],

        // slow
        'crosstable.json': [TYPE_SLOW, WATCH_SLOW],
        'Eventcrosstable.json': [TYPE_SLOW, WATCH_SLOW],
        'gamelist.json': [TYPE_SLOW, WATCH_SLOW],
        'schedule.json': [TYPE_SLOW, WATCH_SLOW],
        'tournament.json': [TYPE_SLOW, WATCH_SLOW],

        // slower
        'banner.txt': [TYPE_SLOWER, WATCH_SLOWER],
        'crash.json': [TYPE_SLOWER, WATCH_SLOWER],
        'enginerating.json': [TYPE_SLOWER, WATCH_SLOWER],
    };

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Watch object
 * @typedef {Object} Watch
 * @property {Buffer} buffer
 * @property {number} date file date
 * @property {FileHandle} fin read file handler
 * @property {number} interval watchFile interval
 * @property {number} position read position
 * @property {number} prev_size previous file size
 * @property {number} sent sent time => to prevent sending too many messages
 * @property {number} size file size
 * @property {string} text last read text
 * @property {number} type &1:changes (log+pgn), &2:changes_only (log), &4:align (pgn), &8:fast, &16:slow, &32:slower
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
    constructor({live_log='live.log', live_pgn='live.pgn', live_prefix='./'}={}) {
        super(MESSAGES);

        this.live_log = path.join(live_prefix, live_log);
        this.live_pgn = path.join(live_prefix, live_pgn);

        // create watches
        this.watches = Assign({}, ...Keys(WATCHES).map(key => {
            let watch = WATCHES[key];
            if (key == 'log')
                key = this.live_log;
            else if (key == 'pgn')
                key = this.live_pgn;

            return {
                [key]: {
                    buffer: null,
                    date: 0,
                    filename: key,
                    fin: null,
                    interval: watch[1],
                    position: 0,
                    prev_size: 0,
                    size: 0,
                    text: '',
                    type: watch[0],
                },
            };
        }));

        Assign(DEV_TESTS, {
            silent: 0,
            start: 1,
            url: 1,
            user: 1,
            // watch: 1,
            // watch3: 1,          // PGN
            ws: 1,
        });
    }

    /**
     * Close a watch file handler
     * @param {Watch} watch
     * @param {string} origin
     */
    async closeWatchFile(watch, origin) {
        if (DEV.watch)
            LS('closeWatchFile:', origin, !!watch.fin, DEV);
        if (watch.fin) {
            await watch.fin.close();
            watch.fin = null;
        }
    }

    /**
     * Handle the LOG text
     * @param {Watch} watch
     */
    handleLog(watch) {
        if (DEV.watch2)
            LS('LOG: ', watch.prev_size, '=>', watch.size);

        let best_lines = {},
            flag = 0,
            lines = watch.text.split('\n'),
            num_line = lines.length,
            pv_lines = [],
            pvs = {};

        // keep the best messages:
        // - 1:startpos, 2:go, 4:pv, 8:bestmove
        // - must have " <" => engine message
        // - unique PVs = better
        // - too many messages => spread them evently, but keep the edges
        for (let i = num_line - 1; i >= 0; i --) {
            if (flag == 1 + 2 + 4 + 8 + 16 || best_lines.length > 8)
                break;

            let line = lines[i];
            if (line.includes(' startpos ')) {
                flag |= 1;
                best_lines[i] = 1;
                continue;
            }
            else if (line.includes(' go ')) {
                flag |= 2;
                best_lines[i] = 2;
                continue;
            }
            else if (line.includes(' setoption ')) {
                best_lines[i] = 16;
                continue;
            }

            let pos = line.indexOf(' <');
            if (pos < 0 || pos > 15)
                continue;

            let pvpos = line.indexOf(' pv');
            if (pvpos > 0) {
                let pv = line.slice(pvpos + 4);

                if (!(flag & 4)) {
                    flag |= 4;
                    best_lines[i] = 4;
                    if (!pvs[pv])
                        pvs[pv] = 1;
                }
                else if (!pvs[pv]) {
                    pvs[pv] = 1;
                    pv_lines.push(i);
                    if (pv_lines.length >= 3)
                        flag |= 16;
                }
                continue;
            }

            if (line.includes(' bestmove ')) {
                flag |= 8;
                best_lines[i] = 8;
            }
        }

        // assemble the result
        for (let pv_line of pv_lines)
            best_lines[pv_line] = 0;

        let result = Keys(best_lines).map(i => [
                best_lines[i],
                lines[i].replace(/[<>]/g, '').trim(),
            ]);

        // send
        if (!result.length)
            return;
        watch.sent = Now(true);
        this.publish('log', MSG_CUSTOM_LOG, result);
    }

    /**
     * Handle the PGN text
     * @param {Watch} watch
     */
    handlePgn(watch) {
        // cute ending
        let text = watch.text;
        if (text.slice(-3) == '*\n\n') {
            let slice = 3;
            if (' \n'.includes(text[text.length - 4]))
                slice ++;

            text = text.slice(0, -slice);
            watch.text = text;
            watch.position -= slice;
            if (watch.position < 0)
                watch.position = 0;
        }
        if (DEV.watch3)
            LS('PGN:', watch.position, ':', text);

        watch.sent = Now(true);
        this.publish('pgn', MSG_CUSTOM_PGN, text.trim());
    }

    /**
     * Run extra commands
     */
    async initialise_after() {
        if (DEV.start)
            LS(`TCEC server ${VERSION}`);

        await this.watchFiles();
    }

    /**
     * Read data from a file handle
     * @param {Watch} watch
     * @param {boolean=} again called from within the function
     * @returns {string}
     */
    async readData(watch, again) {
        let filename = watch.filename;

        // 1) allocate objects
        if (!watch.fin) {
            watch.fin = await fsa.open(filename, 'r');
            if (!(watch.type & TYPE_CHANGE_ONLY))
                watch.position = 0;
        }
        if (!watch.buffer)
            watch.buffer = new Buffer.alloc(4096);

        // full file read? not for LOG/PGN
        if (!(watch.type & TYPE_CHANGE))
            watch.position = 0;

        // 2) read text
        watch.prev_size = watch.size;
        let text = '';

        // align? for PGN
        let align = 0;
        if (!again && (watch.type & TYPE_ALIGN) && watch.position > 0) {
            align = Min(watch.position, ALIGN_BLOCK);
            watch.position -= align;
        }

        while (true) {
            let result;
            try {
                result = await watch.fin.read(watch.buffer, 0, watch.buffer.length, watch.position);
            }
            catch (e) {
                if (DEV.watch)
                    LS('readData__error', filename, e, watch.buffer.length, watch.position);

                // try again
                await this.closeWatchFile(watch, 'readData');
                watch.fin = await fsa.open(filename, 'r');
                if (watch.fin)
                    result = await watch.fin.read(watch.buffer, 0, watch.buffer.length, watch.position);
            }

            let count = result.bytesRead;
            if (!count)
                break;
            watch.position += count;

            let new_data = result.buffer.slice(0, count).toString();
            if (DEV.watch2)
                LS('text:', count, ':', new_data);
            text += new_data;
        }

        // 3) result
        // misalignment => must read the whole file
        if (align) {
            let stext = text.slice(0, align),
                swatch = watch.text.slice(-align),
                misaligned = (stext != swatch);
            if (DEV.watch3)
                LS('align:', align, '\n  block:', swatch, '\n    new:', stext, misaligned? '!!!': '');

            if (misaligned) {
                watch.position = 0;
                return await this.readData(watch, true);
            }
            text = text.slice(align);
        }

        watch.size = watch.position;
        watch.text = text;
        return text;
    }

    /**
     * Utility to watch one file
     * @param {string} filename
     * @param {Function} callback
     */
    async watchFile(filename, callback) {
        if (DEV.watch)
            LS('watchFile__watch', filename);

        // 1) check watch
        let watch = this.watches[filename];
        if (!watch) {
            LS('watchFile__unknown', filename, watch, this.watches);
            return;
        }

        // 2) file exists? => read it
        if (!(watch.type & TYPE_CHANGE_ONLY)) {
            let text;
            try {
                text = await this.readData(watch);
            }
            catch (e) {
                if (DEV.watch)
                    LS('watchFile__exist_error', filename, e);
                await this.closeWatchFile(watch, 'watchFile_exist');
            }

            if (text)
                callback(watch);
        }

        // 3) watch file
        let interval = watch.interval;
        interval += RandomInt(INTERVAL_RANDOM);

        fs.watchFile(filename, {interval: interval}, async () => {
            // a) get file size
            let stat;
            try {
                stat = await fsa.stat(filename);
            }
            catch (e) {
                if (DEV.watch)
                    LS('watchFile__stat_error', filename, e);
                await this.closeWatchFile(watch, 'watchFile_stat');
                return;
            }

            let size = stat.size,
                delta = size - watch.size;
            if (size < 1 || !delta)
                return;

            // b) read unread data
            let text;
            try {
                text = await this.readData(watch);
            }
            catch (e) {
                if (DEV.watch)
                    LS('watchFile__read_error', filename, e);
                await this.closeWatchFile(watch, 'watchFile_read');
                return;
            }

            if (text)
                callback(watch);
        });

        if (DEV.watch)
            LS('watching', filename);
    }

    /**
     * Watch the log + pgn files
     */
    async watchFiles() {
        // 1) real time stuff
        this.watchFile(this.live_pgn, watch => this.handlePgn(watch));
        this.watchFile(this.live_log, watch => this.handleLog(watch));

        // 2) everything else
        Keys(this.watches).map(key => {
            let watch = this.watches[key];
            if (watch.type <= TYPE_SLOWER)
                return;

            this.watchFile(key, watch => {
                if (DEV.watch2)
                    LS('WATCH: ', key, ':', watch.prev_size, '=>', watch.size);

                watch.sent = Now(true);
                this.publish(key, key, watch.text);
            });
        });

        if (DEV.watch)
            LS('watching files ...');
    }

    // SERVER
    /////////

    /**
     * Opened a websocket
     * @param {!Object} socket
     */
    async opened_socket(socket) {
        let data = Stringify([MSG_USER_COUNT, this.num_socket]);
        socket.send(data);
        this.app.publish('count', data);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// exports
/* globals module */
// <<
module.exports = {
    TCEC: TCEC,
};
