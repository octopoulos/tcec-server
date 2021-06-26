// common-server.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-06-25
//
/*
globals
expect, require, test
*/
'use strict';

let {Assign, IsFunction, Keys} = require('./common.js'),
    {checkRequest, readTextCached, readTextSafe} = require('./common-server.js');

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// checkRequest
[
    [
        {
            getHeader: () => '127.0.0.1',
            getQuery: () => 'x=home&y=5',
            getUrl: () => 'http://localhost:8080/api',
        },
        {
            headers: {'x-real-ip': '127.0.0.1'},
            query: {
                x: 'home',
                y: '5',
            },
            url: 'http://localhost:8080/api',
        },
    ],
].forEach(([req, answer], id) => {
    test(`checkRequest:${id}`, () => {
        checkRequest(req);
        let dico = Assign({}, ...Keys(req).filter(key => !IsFunction(req[key])).map(key => ({[key]: req[key]})));
        expect(dico).toEqual(answer);
    });
});

// readTextCached
[
    ['', null],
    ['TODO', 'TODO\n=====\n'],
    ['TODO', 'TODO\n=====\n'],
].forEach(([filename, answer], id) => {
    test(`readTextCached:${id}`, async () => {
        let data = await readTextCached(filename);
        if (data)
            data = data.replace(/\r\n/g, '\n');
        if (answer)
            data = data.slice(0, answer.length);
        expect(data).toEqual(answer);
    });
});

// readTextSafe
[
    ['', null],
    ['TODO', 'TODO\n=====\n'],
].forEach(([filename, answer], id) => {
    test(`readTextSafe:${id}`, async () => {
        let data = await readTextSafe(filename);
        if (data)
            data = data.replace(/\r\n/g, '\n');
        if (answer)
            data = data.slice(0, answer.length);
        expect(data).toEqual(answer);
    });
});
