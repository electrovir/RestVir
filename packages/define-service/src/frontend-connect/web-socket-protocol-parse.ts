/* eslint-disable unicorn/number-literal-case */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// cspell:ignore Einar Stangvik Arnout Kazemier Pinca

/**
 * This file's contents were extracted from the [`ws`](https://www.npmjs.com/package/ws) package's
 * following files:
 *
 * - https://github.com/websockets/ws/blob/b9ca55b0aa8c72b39a778542bd0fa9b6c455d4c4/lib/subprotocol.js
 * - https://github.com/websockets/ws/blob/b9ca55b0aa8c72b39a778542bd0fa9b6c455d4c4/lib/validation.js
 *
 * That package has the following license:
 *
 *     Copyright (c) 2011 Einar Otto Stangvik <einaros@gmail.com>
 *     Copyright (c) 2013 Arnout Kazemier and contributors
 *     Copyright (c) 2016 Luigi Pinca and contributors
 *
 *     Permission is hereby granted, free of charge, to any person obtaining a copy of
 *     this software and associated documentation files (the "Software"), to deal in
 *     the Software without restriction, including without limitation the rights to
 *     use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 *     the Software, and to permit persons to whom the Software is furnished to do so,
 *     subject to the following conditions:
 *
 *     The above copyright notice and this permission notice shall be included in all
 *     copies or substantial portions of the Software.
 *
 *     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 *     FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 *     COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 *     IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 *     CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

//
// Allowed token characters:
//
// '!', '#', '$', '%', '&', ''', '*', '+', '-',
// '.', 0-9, A-Z, '^', '_', '`', a-z, '|', '~'
//
// tokenChars[32] === 0 // ' '
// tokenChars[33] === 1 // '!'
// tokenChars[34] === 0 // '"'
// ...
//
// prettier-ignore
const tokenChars = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
  0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, // 32 - 47
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, // 80 - 95
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0 // 112 - 127
];

/**
 * Parses the `Sec-WebSocket-Protocol` header into a set of subprotocol names. This is extracted
 * from the [`ws`](https://www.npmjs.com/package/ws) package. This is used internally to verify if a
 * set of protocols is valid.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function parseSecWebSocketProtocolHeader(header: string): Set<string> {
    const protocols = new Set<string>();
    let start = -1;
    let end = -1;
    let i = 0;

    for (i; i < header.length; i++) {
        const code = header.codePointAt(i)!;

        if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) {
                start = i;
            }
        } else if (i !== 0 && (code === 0x20 /* ' ' */ || code === 0x09) /* '\t' */) {
            /* node:coverage ignore next 3: idk how to trigger this */
            if (end === -1 && start !== -1) {
                end = i;
            }
        } else if (code === 0x2c /* ',' */) {
            if (start === -1) {
                throw new SyntaxError(`Unexpected character at index ${i}`);
            }

            if (end === -1) {
                end = i;
            }

            const protocol = header.slice(start, end);

            if (protocols.has(protocol)) {
                throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
            }

            protocols.add(protocol);
            start = end = -1;
        } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
        }
    }

    /* node:coverage ignore next 3: idk how to trigger this */
    if (start === -1 || end !== -1) {
        throw new SyntaxError('Unexpected end of input');
    }

    const protocol = header.slice(start, i);

    if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
    }

    protocols.add(protocol);
    return protocols;
}
