// common.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-19
//
// subset of the GUI common.js
//
/*
globals
console, exports
*/
'use strict';

// SHORTCUTS
////////////

let Assign = Object.assign,
    Floor = Math.floor,
    IsArray = Array.isArray,
    IsFunction = value => (typeof(value) == 'function'),
    IsString = value => (typeof(value) == 'string'),
    Keys = Object.keys,
    LS = console.log.bind(console),
    Max = Math.max,
    Min = Math.min,
    Round = Math.round,
    Stringify = JSON.stringify.bind(JSON);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Remove all properties of an object
 * @param {!Object} dico
 * @returns {!Object}
 */
function Clear(dico) {
    Keys(dico).forEach(key => {
        delete dico[key];
    });
    return dico;
}

/**
 * Get the timestamp in seconds
 * @param {boolean=} as_float get seconds as float instead of int
 * @returns {number} seconds
 * @example
 * Now(true)    // 1573706158.324 = sec
 * Now()        // 1573706158 = sec
 * Date.now()   // 1573706158324 = ms
 */
function Now(as_float) {
    let seconds = Date.now() / 1000;
    return as_float? seconds: Floor(seconds);
}

/**
 * Try to parse JSON data
 * @param {string} text
 * @param {*=} def
 * @returns {*}
 */
function ParseJSON(text, def) {
    let json;
    try {
        json = JSON.parse(text);
    }
    catch (e) {
        json = def;
    }
    return json;
}

/**
 * Same as Python's set_default
 * @param {!Object} dico
 * @param {string} key
 * @param {*} def
 * @returns {*} dico[key]
 */
function SetDefault(dico, key, def) {
    let child = dico[key];
    if (child === undefined) {
        dico[key] = def;
        child = dico[key];
    }
    return child;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// <<
if (typeof exports != 'undefined') {
    Object.assign(exports, {
        Assign: Assign,
        Clear: Clear,
        Floor: Floor,
        IsArray: IsArray,
        IsFunction: IsFunction,
        IsString: IsString,
        Keys: Keys,
        LS: LS,
        Max: Max,
        Min: Min,
        Now: Now,
        ParseJSON: ParseJSON,
        Round: Round,
        SetDefault: SetDefault,
        Stringify: Stringify,
    });
}
// >>
