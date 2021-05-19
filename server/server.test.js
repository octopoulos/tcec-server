// server.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-19
//
/*
globals
__dirname, afterAll, beforeAll, describe, expect, require, test
*/
'use strict';

let {IsArray, ParseJSON} = require('./common.js'),
    {Server} = require('./server.js');

let dummy_request = {
        body: '',
        headers: {},
        query: '',
        url: '',
    },
    DummyResponse = function() {
        this.data = '';
        this.header = {};
        this.end = data => {if (data) this.data += data;};
        this.writeHeader = (key, value) => {this.header[key] = value;};
        return this;
    },
    DummySocket = function() {
        this.data = '';
        this.dead = 0;
        this.send = data => {if (data) this.data = data;};
        return this;
    },
    MESSAGES = [
        0,
        'ip_get',                   // 1
        'user_subscribe',           // 2
        'user_unsubscribe',         // 3
    ],
    MSG_IP_GET = MESSAGES.indexOf('ip_get'),
    server;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe('server', () => {
beforeAll(async () => {
    server = new Server(MESSAGES);
    await server.initialise({
        dev: {},
        dirname: __dirname,
        home: 'server',
    });
});
afterAll(async () => {
    // await server.destroy();
});

// handle_request
[
    ['api', {}, '[-1,0,{}]'],
    ['api', {body: [MSG_IP_GET]}, `[${MSG_IP_GET},null]`],
    ['api', {body: [MSG_IP_GET], headers: {'x-real-ip': '145.23.11.99'}}, `[${MSG_IP_GET},"145.23.11.99"]`],
].forEach(([type, query, answer], id) => {
    test(`handle_request:${id}`, async () => {
        let req = {...dummy_request, ...query},
            res = new DummyResponse();
        await server.handle_request(type, req, res);
        if (IsArray(answer)) {
            let json = ParseJSON(res.data);
            expect(json[0]).toEqual(answer[0]);
            expect(json[1]).toEqual(expect.objectContaining(answer[1]));
        }
        else
            expect(res.data).toEqual(answer);
    });
});

// handle_socket
[
    [[], ''],
].forEach(([json, answer], id) => {
    test(`handle_socket:${id}`, async () => {
        let socket = new DummySocket();
        await server.handle_socket(socket, json);
        let data = socket.data;
        if (IsArray(answer)) {
            let json = ParseJSON(data);
            expect(json[0]).toEqual(answer[0]);
            expect(json[1]).toEqual(expect.objectContaining(answer[1]));
        }
        else
            expect(data).toEqual(answer);
    });
});

// ip_get
[
    [{}, undefined],
    [{ip: '127.0.0.1'}, '127.0.0.1'],
].forEach(([query, answer], id) => {
    test(`ip_get:${id}`, async () => {
        let data = await server.ip_get(query);
        expect(data).toEqual(answer);
    });
});
});
