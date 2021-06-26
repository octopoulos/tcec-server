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
    MSG_USER_UNSUBSCRIBE = 4,
    //
    MSG_CUSTOM_LOG = 5,
    MSG_CUSTOM_PGN = 6;

let MESSAGES = {
    'ip_get': MSG_IP_GET,
    'user_count': MSG_USER_COUNT,
    'user_subscribe': MSG_USER_SUBSCRIBE,
    'user_unsubscribe': MSG_USER_UNSUBSCRIBE,
};

let VERSION = '20210520';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// <<
if (typeof exports != 'undefined') {
    Object.assign(exports, {
        MESSAGES: MESSAGES,
        MSG_CUSTOM_LOG: MSG_CUSTOM_LOG,
        MSG_CUSTOM_PGN: MSG_CUSTOM_PGN,
        MSG_USER_COUNT: MSG_USER_COUNT,
        VERSION: VERSION,
    });
}
// >>
