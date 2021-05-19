// common-server.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-19
//
/*
globals
expect, require, test
*/
'use strict';

let {Assign, IsFunction, Keys} = require('./common.js'),
    {check_request, read_text_safe} = require('./common-server.js');

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// check_request
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
    test(`check_request:${id}`, () => {
        check_request(req);
        let dico = Assign({}, ...Keys(req).filter(key => !IsFunction(req[key])).map(key => ({[key]: req[key]})));
        expect(dico).toEqual(answer);
    });
});

// read_text_safe
[
    ['', null],
    ['inspect.bat', 'py ./script/inspector.py\n'],
].forEach(([filename, answer], id) => {
    test(`read_text_safe:${id}`, async () => {
        let data = await read_text_safe(filename);
        if (data)
            data = data.replace(/\r\n/g, '\n');
        expect(data).toEqual(answer);
    });
});
