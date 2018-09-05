function assert(condition, message = "Assertion error") {
    if (!condition)
        throw new Error(message);
}

function isNumeric(n) {
    return (n !== null) && (n !== undefined) && !!n.toFixed;
}

function isString(s) {
    return (typeof s === 'string' || s instanceof String);
}


let isArray = Array.isArray;
let keyList = Object.keys;
let hasProp = Object.prototype.hasOwnProperty;

function equal(a, b) {
    if (a === b) return true;

    if (a && b && typeof a == 'object' && typeof b == 'object') {
        var arrA = isArray(a)
            , arrB = isArray(b)
            , i
            , length
            , key;

        if (arrA && arrB) {
            length = a.length;
            if (length != b.length) return false;
            for (i = length; i-- !== 0;)
                if (!equal(a[i], b[i])) return false;
            return true;
        }

        if (arrA != arrB) return false;

        var dateA = a instanceof Date
            , dateB = b instanceof Date;
        if (dateA != dateB) return false;
        if (dateA && dateB) return a.getTime() == b.getTime();

        var regexpA = a instanceof RegExp
            , regexpB = b instanceof RegExp;
        if (regexpA != regexpB) return false;
        if (regexpA && regexpB) return a.toString() == b.toString();

        var keys = keyList(a);
        length = keys.length;

        if (length !== keyList(b).length)
            return false;

        for (i = length; i-- !== 0;)
            if (!hasProp.call(b, keys[i])) return false;

        for (i = length; i-- !== 0;) {
            key = keys[i];
            if (!equal(a[key], b[key])) return false;
        }

        return true;
    }

    return a!==a && b!==b;
}

function select(s1, ...args) {
    if (s1 !== undefined) {
        return s1;
    } else {
        if (args.length === 0) {
            return undefined;
        }

        return select(...args);
    }
}

function time(func, times = 1) {
    let time = performance.now();

    for (let i = 0; i < times; i++)
        func();

    return (performance.now() - time) / times;
}

function isInteger(x) {
    return isNumeric(x) && (x % 1 === 0);
}

function inRange(x, min, max) {
    return (min <= x) && (x <= max);
}

function inStrictRange(x, min, max) {
    return (min < x) && (x < max);
}

function isTypedArray(arr) {
    return ArrayBuffer.isView(arr) && (!(arr instanceof DataView));
}

// Credit to Sean Yen (www.github.com/sheeptester)
const sigfigRegex = /^-?0*(?:((?:[1-9][0-9]*)?[1-9])0*|([1-9][0-9]*(?:\.[0-9]+)?)(?:\.)?|\.0*([1-9][0-9]*))$/;

function countSimpleSigFigs(string) {
    return select(...sigfigRegex.exec(string).slice(1, 4)).replace('.', '').length;
}

function convertSigFigs(string) {
    string = string.toLowerCase().replace(/ \t\n\r/g, '');

    if (string.includes('c')) {
        string = string.replace('c', '');

        let float = parseFloat(string);

        if (!isNaN(float))
            return new SigFigNumber(float, Infinity);
        else
            return null
    }

    let float = parseFloat(string);

    if (isNaN(float))
        return null;

    if (string.includes('e')) {
        let components = string.split('e');

        let mantissa = components[0];

        let sigfigs = countSimpleSigFigs(mantissa);
        if (sigfigs === undefined)
            return null;

        return new SigFigNumber(float, sigfigs);
    }

    let sigfigs = countSimpleSigFigs(string);
    if (sigfigs === undefined)
        return null;

    return new SigFigNumber(float, sigfigs);
}

class Quantity {}

class SigFigNumber extends Quantity {
    constructor(value, sigfigs=Infinity) {
         // Change if there can be 0 sig figs
        super();

        this.value = value;
        this.figs = sigfigs;
    }

    get figs() {
        return Math.floor(Math.log10(this.value)) - this._lastSigPlace + 1;
    }

    set figs(sigfigs) {
        assert((isInteger(sigfigs) || sigfigs === Infinity), "Invalid number of sigfigs");
        this.lastSigPlace = Math.floor(Math.log10(this.value)) - sigfigs + 1;
    }

    get value() {
        return this._value;
    }

    set value(value) {
        assert(isNumeric(value), "Invalid value");
        this._value = value;
    }

    rounded() {
        let c = Math.pow(10, this.lastSigPlace);

        return new SigFigNumber(Math.round(this.value / c) * c, this.figs);
    }

    floatString() {
        let num = this.rounded();

        return num.value.toFixed(Math.max(0, -this.lastSigPlace));
    }

    scientific(html = false) {
        let value = this.value;
        if (value === 0)
            return '0';

        let b = Math.floor(Math.log10(this.value));
        let c = Math.pow(10, b);

        value /= c;

        if (this.figs > 0)
            return html ?
                value.toFixed(this.figs - 1) + '<sup>' + b + '</sup>'
                : value.toFixed(this.figs - 1) + 'e' + b;
        else
            return '0';
    }


    display(html = false) {
        let num = this.rounded();

        if (num.figs === Infinity)
            return num.floatString() + 'c';

        let lastSigPlace = num.lastSigPlace;

        if (lastSigPlace < 0)
            return num.floatString();

        if (lastSigPlace === 0 && num.value % 10 === 0)
            return num.floatString() + '.';

        if (lastSigPlace === 0)
            return num.floatString();

        if (convertSigFigs(num.floatString()).figs !== num.figs)
            return this.scientific(html);

        return num.floatString();
    }

    mul(n) {
        return new SigFigNumber(this.value * n.value, Math.min(this.figs, n.figs));
    }

    div(n) {
        return new SigFigNumber(this.value / n.value, Math.min(this.figs, n.figs));
    }

    add(n) {
        let num = new SigFigNumber(this.value + n.value, Infinity);

        num.lastSigPlace = Math.max(this.lastSigPlace, n.lastSigPlace);

        return num;
    }

    sub(n) {
        let num = new SigFigNumber(this.value - n.value, Infinity);

        num.lastSigPlace = Math.max(this.lastSigPlace, n.lastSigPlace);

        return num;
    }

    get lastSigPlace() {
        return this._lastSigPlace;
    }

    set lastSigPlace(value) {
        assert((isInteger(value) || value === -Infinity), "Invalid last sig place");
        this._lastSigPlace = value;
    }

    clone() {
        return new SigFigNumber(this.value, this.figs);
    }
}

const OPS = {
    MUL: 0,
    DIV: 1,
    ADD: 2,
    SUB: 3
};

/*
Expression format:

[operator, ... arguments ...]

Example: 3.49 + (5c * 3c)

-> [OPS.ADD, SigFigNumber(3.49, 3), [OPS.MUL, SigFigNumber(5, Infinity), SigFigNumber(3, Infinity)]]
 */

const TOKENS = {
    WHITESPACE: -1,
    ...OPS,
    OPEN_PAREN: 4,
    CLOSE_PAREN: 5,
    QUANTITY: 6,
    DONE: 7
};

OPS.MINUS = 5;

const whitespaceRegex = /^(\s)/;
const quantityRegex = /^(([0-9]+\.?[0-9]*)|([0-9]*\.?[0-9]+))(e[0-9]*)?c?/;
const addRegex = /^\+/;
const subRegex = /^-/;
const mulRegex = /^\*/;
const divRegex = /^\//;
const openParenRegex = /^\(/;
const closeParenRegex = /^\)/;

function* tokenize(expr) { // yields [token, index, content]
    let i;

    for (i = 0; i < expr.length;) {
        let expr_trim = expr.slice(i);

        let res;

        if ([
            whitespaceRegex,
            mulRegex,
            divRegex,
            addRegex,
            subRegex,
            openParenRegex,
            closeParenRegex,
            quantityRegex
        ].some((regex, regexIndex) => {
            let match = regex.exec(expr_trim);

            if (match) {
                res = [regexIndex - 1, i, match[0]];
                return true;
            }

            return false;
        })) {
            yield res;
            i += res[2].length;
        } else {
            throw new Error(`Unknown token at character index ${i}: ... ${expr.slice(Math.max(0, i - 3), Math.min(i + 3, expr.length))} ...`)
        }
    }
}

function parseQuantity(quantity) {
    return convertSigFigs(quantity);
}

function expressify(expr) {
    let tokenizer = tokenize(expr);
    let token_c;

    let stack = [];

    while (token_c = tokenizer.next(), !token_c.done) {
        let token = token_c.value;
        
        switch (token[0]) {
            case TOKENS.SUB:
            case TOKENS.ADD:
            case TOKENS.MUL:
            case TOKENS.DIV:
                stack.push({t: token[0], i: token[1]});
                break;
            case TOKENS.OPEN_PAREN:
                stack.push({t: '(', i: token[1]});
                break;
            case TOKENS.CLOSE_PAREN:
                stack.push({t: ')', i: token[1]});
                break;
            case TOKENS.QUANTITY:
                stack.push({t: parseQuantity(token[2]), i: token[1]});
        }
    }

    return stack;
}