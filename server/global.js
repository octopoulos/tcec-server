// global.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-20
//
// global variables/functions shared across multiple js files
/*
globals
exports
*/
'use strict';

// messages
let MSG_IP_GET = 1,
    MSG_USER_COUNT = 2,
    MSG_USER_SUBSCRIBE = 3,
    MSG_USER_UNSUBSCRIBE = 4;

let MESSAGES = [
    0,
    'ip_get',                   // 1
    'user_count',               // 2
    'user_subscribe',           // 3
    'user_unsubscribe',         // 4
];

let VERSION = '20210520';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// <<
if (typeof exports != 'undefined') {
    Object.assign(exports, {
        MESSAGES: MESSAGES,
        MSG_USER_COUNT: MSG_USER_COUNT,
        VERSION: VERSION,
    });
}
// >>
