/* eslint-disable @typescript-eslint/no-non-null-assertion */
// cspell:ignore Embrey
/* node:coverage disable */

/**
 * This file was copied from
 * https://github.com/pillarjs/path-to-regexp/blob/39e861d02d959ba99d0632af994ab48d4a8eeb14/src/index.ts
 * because its published package on Npm is not browser friendly. It has been modified here to remove
 * all code not used in rest-vir and to meet rest-vir's coding standards.
 *
 * The original package and file source have the following license:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Blake Embrey (hello@blakeembrey.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const DEFAULT_DELIMITER = '/';
const ID_START = /^[$_\p{ID_Start}]$/u;
const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u;
const DEBUG_URL = 'https://git.new/pathToRegexpError';

type TokenType =
    | '{'
    | '}'
    | 'WILDCARD'
    | 'PARAM'
    | 'CHAR'
    | 'ESCAPED'
    | 'END'
    // Reserved for use or ambiguous due to past use.
    | '('
    | ')'
    | '['
    | ']'
    | '+'
    | '?'
    | '!';

/** Tokenizer results. */
type LexToken = {
    type: TokenType;
    index: number;
    value: string;
};

const SIMPLE_TOKENS: Record<string, TokenType> = {
    // Groups.
    '{': '{',
    '}': '}',
    // Reserved.
    '(': '(',
    ')': ')',
    '[': '[',
    ']': ']',
    '+': '+',
    '?': '?',
    '!': '!',
};

/** Escape a regular expression string. */
function escape(str: string) {
    return str.replace(/[.+*?^${}()[\]|/\\]/g, String.raw`\$&`);
}

/** Tokenize input string. */
function* lexer(str: string): Generator<LexToken, LexToken> {
    const chars = str.split('');
    let i = 0;

    function name() {
        let value = '';

        if (ID_START.test(chars[++i]!)) {
            value += chars[i]!;
            while (ID_CONTINUE.test(chars[++i]!)) {
                value += chars[i]!;
            }
        } else if (chars[i] === '"') {
            let pos = i;

            while (i < chars.length) {
                if (chars[++i] === '"') {
                    i++;
                    pos = 0;
                    break;
                }

                if (chars[i] === '\\') {
                    value += chars[++i]!;
                } else {
                    value += chars[i]!;
                }
            }

            if (pos) {
                throw new TypeError(`Unterminated quote at ${pos}: ${DEBUG_URL}`);
            }
        }

        if (!value) {
            throw new TypeError(`Missing parameter name at ${i}: ${DEBUG_URL}`);
        }

        return value;
    }

    while (i < chars.length) {
        const value = chars[i]!;
        const type = SIMPLE_TOKENS[value];

        if (type) {
            yield {type, index: i++, value};
        } else if (value === '\\') {
            yield {type: 'ESCAPED', index: i++, value: chars[i++]!};
        } else if (value === ':') {
            const value = name();
            yield {type: 'PARAM', index: i, value};
        } else if (value === '*') {
            const value = name();
            yield {type: 'WILDCARD', index: i, value};
        } else {
            yield {type: 'CHAR', index: i, value: chars[i++]!};
        }
    }

    return {type: 'END', index: i, value: ''};
}

class Iter {
    private _peek: LexToken | undefined;

    constructor(private tokens: Generator<LexToken, LexToken>) {}

    peek(): LexToken {
        if (!this._peek) {
            const next = this.tokens.next();
            this._peek = next.value;
        }
        return this._peek;
    }

    tryConsume(type: TokenType): string | undefined {
        const token = this.peek();
        if (token.type !== type) {
            return;
        }
        this._peek = undefined; // Reset after consumed.
        return token.value;
    }

    consume(type: TokenType): string {
        const value = this.tryConsume(type);
        if (value !== undefined) {
            return value;
        }
        const {type: nextType, index} = this.peek();
        throw new TypeError(`Unexpected ${nextType} at ${index}, expected ${type}: ${DEBUG_URL}`);
    }

    text(): string {
        let result = '';
        let value: string | undefined;
        while ((value = this.tryConsume('CHAR') || this.tryConsume('ESCAPED'))) {
            result += value;
        }
        return result;
    }
}

/** Plain text. */
type Text = {
    type: 'text';
    value: string;
};

/** A parameter designed to match arbitrary text within a segment. */
type Parameter = {
    type: 'param';
    name: string;
};

/** A wildcard parameter designed to match multiple segments. */
type Wildcard = {
    type: 'wildcard';
    name: string;
};

/** A set of possible tokens to expand when matching. */
type Group = {
    type: 'group';
    tokens: Token[];
};

/** A token that corresponds with a regexp capture. */
type Key = Parameter | Wildcard;

/** A sequence of `path-to-regexp` keys that match capturing groups. */
type Keys = Array<Key>;

/** A sequence of path match characters. */
type Token = Text | Parameter | Wildcard | Group;

/** Tokenized path instance. */
class TokenData {
    constructor(public readonly tokens: Token[]) {}
}

/** Parse a string for the raw tokens. */
function parse(stringToParse: string): TokenData {
    const iterator = new Iter(lexer(stringToParse));

    function consume(endType: TokenType): Token[] {
        const tokens: Token[] = [];

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
            const path = iterator.text();
            if (path) {
                tokens.push({type: 'text', value: path});
            }

            const param = iterator.tryConsume('PARAM');
            if (param) {
                tokens.push({
                    type: 'param',
                    name: param,
                });
                continue;
            }

            const wildcard = iterator.tryConsume('WILDCARD');
            if (wildcard) {
                tokens.push({
                    type: 'wildcard',
                    name: wildcard,
                });
                continue;
            }

            const open = iterator.tryConsume('{');
            if (open) {
                tokens.push({
                    type: 'group',
                    tokens: consume('}'),
                });
                continue;
            }

            iterator.consume(endType);
            return tokens;
        }
    }

    const tokens = consume('END');
    return new TokenData(tokens);
}

/**
 * Generic parameter data for {@link MatchResult}.
 *
 * This is from the [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) package.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type ParamData = Partial<Record<string, string | string[]>>;

/**
 * A match result that contains data about the path match. Used in {@link Match}
 *
 * This is from the [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) package.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MatchResult = {
    path: string;
    params: ParamData;
};

/**
 * A match is either `false` (no match) or a match result.
 *
 * This is from the [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) package.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type Match = false | MatchResult;

/**
 * A match function that takes a string and returns whether it matched the path. Used in
 * {@link match}.
 *
 * This is from the [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) package.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export type MatchFunction = (path: string) => Match;

/**
 * Transform a path into a match function.
 *
 * This is from the [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) package.
 *
 * @category Internal
 * @category Package : @rest-vir/define-service
 * @package [`@rest-vir/define-service`](https://www.npmjs.com/package/@rest-vir/define-service)
 */
export function match(path: string): MatchFunction {
    const {regexp, keys} = pathToRegexp(path);

    const decoders = keys.map((key) => {
        if (key.type === 'param') {
            return decodeURIComponent;
        }
        return (value: string) => value.split(DEFAULT_DELIMITER).map(decodeURIComponent);
    });

    return function match(input: string) {
        const m = regexp.exec(input);
        if (!m) {
            return false;
        }

        const path = m[0];
        const params = Object.create(null);

        for (let i = 1; i < m.length; i++) {
            if (m[i] === undefined) {
                continue;
            }

            const key = keys[i - 1]!;
            const decoder = decoders[i - 1]!;
            params[key.name] = decoder(m[i]!);
        }

        return {path, params};
    };
}

function pathToRegexp(path: string) {
    const keys: Keys = [];
    const sources: string[] = [];
    const flags = 'i';

    for (const seq of flat(path)) {
        sources.push(toRegExp(seq, keys));
    }

    let pattern = `^(?:${sources.join('|')})`;
    pattern += `(?:${escape(DEFAULT_DELIMITER)}$)?`;
    pattern += '$';

    const regexp = new RegExp(pattern, flags);
    return {regexp, keys};
}

/** Flattened token set. */
type Flattened = Text | Parameter | Wildcard;

/** Path or array of paths to normalize. */
function* flat(path: string): Generator<Flattened[]> {
    const data = parse(path);
    yield* flatten(data.tokens, 0, []);
}

/** Generate a flat list of sequence tokens from the given tokens. */
function* flatten(tokens: Token[], index: number, init: Flattened[]): Generator<Flattened[]> {
    if (index === tokens.length) {
        return yield init;
    }

    const token = tokens[index]!;

    if (token.type === 'group') {
        for (const seq of flatten(token.tokens, 0, init.slice())) {
            yield* flatten(tokens, index + 1, seq);
        }
    } else {
        init.push(token);
    }

    yield* flatten(tokens, index + 1, init);
}

/** Transform a flat sequence of tokens into a regular expression. */
function toRegExp(tokens: Flattened[], keys: Keys) {
    let result = '';
    let backtrack = '';
    let isSafeSegmentParam = true;

    for (const token of tokens) {
        if (token.type === 'text') {
            result += escape(token.value);
            backtrack += token.value;
            isSafeSegmentParam ||= token.value.includes(DEFAULT_DELIMITER);
        } else {
            if (!isSafeSegmentParam && !backtrack) {
                throw new TypeError(`Missing text after "${token.name}": ${DEBUG_URL}`);
            }

            if (token.type === 'param') {
                result += `(${negate(DEFAULT_DELIMITER, isSafeSegmentParam ? '' : backtrack)}+)`;
            } else {
                result += `([\\s\\S]+)`;
            }

            keys.push(token);
            backtrack = '';
            isSafeSegmentParam = false;
        }
    }

    return result;
}

/** Block backtracking on previous text and ignore delimiter string. */
function negate(delimiter: string, backtrack: string) {
    if (backtrack.length < 2) {
        if (delimiter.length < 2) {
            return `[^${escape(delimiter + backtrack)}]`;
        }
        return `(?:(?!${escape(delimiter)})[^${escape(backtrack)}])`;
    }
    if (delimiter.length < 2) {
        return `(?:(?!${escape(backtrack)})[^${escape(delimiter)}])`;
    }
    return `(?:(?!${escape(backtrack)}|${escape(delimiter)})[\\s\\S])`;
}
