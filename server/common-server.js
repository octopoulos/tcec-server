// common-server.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-06-25
//
// used on the server side
/*
globals
Buffer, module, require
*/
'use strict';

let {DefaultObject, LS, Stringify} = require('./common.js'),
    fsa = require('fs').promises,
    querystring = require('querystring');

let cache_texts = {};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Check a request
 * @param {uWS.HttpRequest} req
 */
function checkRequest(req) {
    let headers = DefaultObject(req, 'headers', {}),
        ip = req.getHeader('x-real-ip');
    headers['x-real-ip'] = ip;
    req.query = querystring.parse(req.getQuery());
    req.url = req.getUrl();
}

/**
 * Read post data
 * @param {uWS.HttpResponse} res
 * @returns {Promise}
 */
function readPost(res) {
    return new Promise((resolve, reject) => {
        let aborted,
            buffer = Buffer.allocUnsafe(0);

        // register data callback
        res.onData((chunk, is_last) => {
            if (aborted)
                return;
            buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
            if (is_last) {
                resolve(buffer);
                aborted = true;
            }
        });

        // register error callback
        res.onAborted(() => {
            aborted = true;
            reject('readPost__abort');
        });
    });
}

/**
 * Read the content of a file in utf-8
 * + use cache
 * @param {string} filename
 * @returns {string}
 */
async function readTextCached(filename) {
    let data = cache_texts[filename];
    if (data)
        return data;

    data = readTextSafe(filename);
    cache_texts[filename] = data;
    return data;
}

/**
 * Read the content of a file in utf-8
 * @param {string} filename
 * @returns {string}
 */
async function readTextSafe(filename) {
    let data = null;
    try {
        data = await fsa.readFile(filename, {encoding: 'utf-8'});
    }
    catch (e) {
        LS(e);
    }
    return data;
}

/**
 * Send the response
 * @param {uWS.HttpResponse} res
 * @param {*} data
 */
function sendResponse(res, data) {
    res.cork(() => {
        res.writeStatus('200 OK');
        res.writeHeader('content-type', 'application/json');
        res.end(Stringify(data));
    });
}

// exports
module.exports = {
    checkRequest: checkRequest,
    readPost: readPost,
    readTextCached: readTextCached,
    readTextSafe: readTextSafe,
    sendResponse: sendResponse,
};
