'use strict';

// String-literal-aware JS comment stripper. Preserves `//` inside string and
// template literals, regex literals, and escapes. Not a full parser.

function stripComments(src) {
    const n = src.length;
    let out = '';
    let i = 0;
    let prevSignificant = '';

    const isRegexContext = () => {
        if (prevSignificant === '') return true;
        return !/[A-Za-z0-9_$)\]}'"`]/.test(prevSignificant);
    };

    while (i < n) {
        const c = src[i];
        const c2 = i + 1 < n ? src[i + 1] : '';

        // Line comment
        if (c === '/' && c2 === '/') {
            i += 2;
            while (i < n && src[i] !== '\n') i++;
            // Leave the newline (if any) for the outer loop to emit, so line
            // structure is preserved.
            continue;
        }

        // Block comment
        if (c === '/' && c2 === '*') {
            i += 2;
            while (i < n) {
                if (src[i] === '*' && i + 1 < n && src[i + 1] === '/') {
                    i += 2;
                    break;
                }
                i++;
            }
            // Emit a single space so tokens on either side don't fuse.
            out += ' ';
            continue;
        }

        // Double- or single-quoted string
        if (c === '"' || c === "'") {
            const quote = c;
            out += c;
            i++;
            while (i < n) {
                const ch = src[i];
                if (ch === '\\' && i + 1 < n) {
                    // Copy escape sequence verbatim (covers \", \', \\, \n, etc.).
                    out += ch + src[i + 1];
                    i += 2;
                    continue;
                }
                out += ch;
                i++;
                if (ch === quote) break;
                if (ch === '\n') break; // unterminated string: bail out of the loop
            }
            prevSignificant = quote;
            continue;
        }

        // Template literal
        if (c === '`') {
            out += c;
            i++;
            let braceDepth = 0;
            while (i < n) {
                const ch = src[i];
                if (ch === '\\' && i + 1 < n) {
                    out += ch + src[i + 1];
                    i += 2;
                    continue;
                }
                if (braceDepth === 0 && ch === '`') {
                    out += ch;
                    i++;
                    break;
                }
                if (braceDepth === 0 && ch === '$' && i + 1 < n && src[i + 1] === '{') {
                    out += '${';
                    i += 2;
                    braceDepth = 1;
                    continue;
                }
                if (braceDepth > 0) {
                    if (ch === '{') braceDepth++;
                    else if (ch === '}') {
                        braceDepth--;
                        out += ch;
                        i++;
                        continue;
                    }
                }
                out += ch;
                i++;
            }
            prevSignificant = '`';
            continue;
        }

        // Regex literal (best-effort)
        if (c === '/' && isRegexContext()) {
            out += c;
            i++;
            let inClass = false;
            while (i < n) {
                const ch = src[i];
                if (ch === '\\' && i + 1 < n) {
                    out += ch + src[i + 1];
                    i += 2;
                    continue;
                }
                if (ch === '[') inClass = true;
                else if (ch === ']') inClass = false;
                out += ch;
                i++;
                if (ch === '/' && !inClass) break;
                if (ch === '\n') break; // unterminated: bail
            }
            // Flags
            while (i < n && /[a-z]/i.test(src[i])) {
                out += src[i];
                i++;
            }
            prevSignificant = '/';
            continue;
        }

        // Default: copy character, update prevSignificant if non-whitespace.
        out += c;
        if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') {
            prevSignificant = c;
        }
        i++;
    }

    return out;
}

module.exports = { stripComments };
