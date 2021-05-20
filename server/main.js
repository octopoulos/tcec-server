// main.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-19
//
/*
globals
__dirname, require
*/
'use strict';

let {LS} = require('./common.js'),
    {TCEC} = require('./tcec.js'),
    yargs = require('yargs');

(async () => {
    let argv = yargs
        .option('live-log', {default: 'live.log', type: 'string'})
        .option('live-pgn', {default: 'live.pgn', type: 'string'})
        .option('live-prefix', {default: './', type: 'string'})
        .help()
        .argv;

    LS(argv);

    let tcec = new TCEC({
            fasts: [
                'data.json',
                'data1.json',
                // 'live.json',
                'liveeval.json',
                'liveeval1.json',
            ],
            live_log: argv.liveLog,
            live_pgn: argv.livePgn,
            live_prefix: argv.livePrefix,
            slows: [
                'banner.txt',
                'crash.json',
                'crosstable.json',
                'enginerating.json',
                'Eventcrosstable.json',
                'gamelist.json',
                'liveengineeval.json',
                'schedule.json',
                'tournament.json',
            ],
        });

    await tcec.initialise({
        dirname: __dirname,
        home: 'server',
    });

    tcec.start_server();
})();
