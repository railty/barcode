'use strict'
const Code = use('App/Models/Code');

class CodeController {
    async create({request, response, view}) {
        let format  = request.params.format;
        let options = request.qs;
        options.text  = request.params.text;

        if (format == "svg"){
            response.header('Content-type', 'image/svg+xml')
        }
        else if (format == "png"){
            response.header('Content-type', 'image/png')
        }

        let barcode = await Code.create(options, format);
        return response.send(barcode);
    }    
    async show({request, response, view}) {
        return view.render('code.show')
    }
}

module.exports = CodeController
