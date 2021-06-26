// common.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-06-05
//
/*
globals
expect, require, test
*/
'use strict';

let {Clear, DefaultObject, IsString, ParseJSON} = require('./common.js');

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Clear
[
    {},
    {session: 'xxx', x: 'home'},
].forEach((dico, id) => {
    test(`Clear:${id}`, () => {
        expect(Clear(dico)).toEqual({});
    });
});

// DefaultObject
[
    [{}, 'areas', {}, {areas: {}}],
    [{areas: [1, 2, 3]}, 'areas', {}, {areas: [1, 2, 3]}],
    [[1, 2, 3], 3, {lan: 'fra', options: {x: 1}}, [1, 2, 3, {lan: 'fra', options: {x: 1}}]],
].forEach(([dico, key, def, answer], id) => {
    test(`DefaultObject:${id}`, () => {
        DefaultObject(dico, key, def);
        expect(dico).toEqual(answer);
    });
});

// IsString
[
    [undefined, false],
    [0, false],
    [NaN, false],
    ['', true],
    ['hello', true],
    [{x: 5}, false],
].forEach(([text, answer], id) => {
    test(`IsString:${id}`, () => {
        expect(IsString(text)).toEqual(answer);
    });
});

// ParseJSON
[
    ['', undefined, undefined],
    ['', 0, 0],
    ['[]', undefined, []],
    ['{"key":"record_get"}', undefined, {key: 'record_get'}],
].forEach(([text, def, answer], id) => {
    test(`ParseJSON:${id}`, () => {
        expect(ParseJSON(text, def)).toEqual(answer);
    });
});
