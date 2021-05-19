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
        .option('password', {default: '', type: 'string'})
        .help()
        .argv;

    LS(argv);

    let tcec = new TCEC();

    await tcec.initialise({
        dirname: __dirname,
        home: 'server',
    });

    tcec.start_server();
})();
