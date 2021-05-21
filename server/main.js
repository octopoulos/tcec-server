// main.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-20
//
/*
globals
__dirname, require
*/
'use strict';

let {TCEC} = require('./tcec.js'),
    yargs = require('yargs');

(async () => {
    let argv = yargs
        .option('live-log', {default: 'live.log', type: 'string'})
        .option('live-pgn', {default: 'live.pgn', type: 'string'})
        .option('live-prefix', {default: '../tcecgui/', type: 'string'})
        .help()
        .argv;

    let tcec = new TCEC({
            live_log: argv.liveLog,
            live_pgn: argv.livePgn,
            live_prefix: argv.livePrefix,
        });

    await tcec.initialise({
        dirname: __dirname,
        home: 'server',
    });

    tcec.start_server();
})();
