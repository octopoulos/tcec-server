// common-server.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-19
//
// used on the server side
/*
globals
Buffer, module, require
*/
'use strict';

let {LS, SetDefault, Stringify} = require('./common.js'),
    fs = require('fs'),
    fsa = fs.promises,
    querystring = require('querystring');

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Check a request
 * @param {!Object} req
 */
function check_request(req) {
    let headers = SetDefault(req, 'headers', {}),
        ip = req.getHeader('x-real-ip');
    headers['x-real-ip'] = ip;
    req.query = querystring.parse(req.getQuery());
    req.url = req.getUrl();
}

/**
 * Read post data
 * @param {!Object} res
 * @param {boolean} is_json
 * @param {Function} callback
 * @param {Function=} err_callback
 */
function read_post(res, is_json, callback, err_callback) {
    let buffer;

    // register data callback
    res.onData((ab, is_last) => {
        let chunk = Buffer.from(ab);
        if (is_last) {
            if (is_json) {
                let json;
                try {
                    json = JSON.parse(buffer? Buffer.concat([buffer, chunk]): chunk);
                } catch (e) {
                    LS(e);
                    res.close();
                }
                callback(json);
            }
            else
                callback(buffer? Buffer.concat([buffer, chunk]): chunk);
        }
        else
            buffer = Buffer.concat(buffer? [buffer, chunk]: [chunk]);
    });

    // register error callback
    res.onAborted(err_callback? err_callback: () => {
        LS(`read_post error: ${is_json}`);
        res.aborted = true;
    });
}

/**
 * Read the content of a file in utf-8
 * @param {string} filename
 * @returns {string}
 */
async function read_text_safe(filename) {
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
 * @param {Object} res
 * @param {Object} data
 */
function send_response(res, data) {
    if (res.aborted) {
        LS(`response was aborted`);
        return;
    }
    // res.writeHead(200, {'content-type': 'application/json'});
    res.writeHeader('content-type', 'application/json');
    res.end(Stringify(data));
}

// exports
module.exports = {
    check_request: check_request,
    read_post: read_post,
    read_text_safe: read_text_safe,
    send_response: send_response,
};
