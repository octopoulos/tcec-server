// hostel.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-19
//
/*
globals
__dirname, Buffer, require
*/
'use strict';

let {Assign, LS} = require('./common.js'),
    {MESSAGES, VERSION} = require('./global.js'),
    {DEV_TESTS, Server} = require('./server.js');

// custom vars

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
     * @constructor
     */
    constructor() {
        super(MESSAGES);

        Assign(DEV_TESTS, {
            start: 1,
            url: 1,
            user: 1,
            ws: 1,
        });

        LS(`TCEC server ${VERSION}`);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// exports
/* globals module */
// <<
module.exports = {
    TCEC: TCEC,
};
