'use strict'
const bwipjs = require('bwip-js');
const drawsvg = require('./drawing-svg');

class Code {
    static async createSvg(opts, format) {
        if (format == "svg"){
            bwipjs.fixupOptions(opts);
            let svg = bwipjs.render(opts, drawsvg(opts, bwipjs.FontLib));
            return svg;
        }
        else if (format == "png"){
            let png = await bwipjs.toBuffer(opts);
            return png;
        }
    }    
}

module.exports = Code

