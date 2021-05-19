// global.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-19
//
// global variables/functions shared across multiple js files
/*
globals
exports
*/
'use strict';

// messages
let MSG_IP_GET = 1,
    MSG_USER_SUBSCRIBE = 2,
    MSG_USER_UNSUBSCRIBE = 3;

let MESSAGES = [
    0,
    'ip_get',                   // 1
    'user_subscribe',           // 2
    'user_unsubscribe',         // 3
];

let VERSION = '20210519';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// <<
if (typeof exports != 'undefined') {
    Object.assign(exports, {
        MESSAGES: MESSAGES,
        VERSION: VERSION,
    });
}
// >>
