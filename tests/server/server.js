import {HttpApplication} from '@themost/web/app';
import path from 'path';
import {EmbeddedProcessEngine} from '../../embedded';
const app = new HttpApplication(path.resolve(__dirname));
import {ODataModelBuilderConfiguration} from '@themost/web/odata';
//use static files
app.useStaticContent(path.resolve(__dirname, './public'));

//use EmbeddedProcessEngine
app.useService(EmbeddedProcessEngine);
//config ODataModelBuilder
ODataModelBuilderConfiguration.config(app).then(function(builder)  {
    builder.hasContextLink(function() {
        return '/api/';
    });
}).catch((err)=> {
    console.log(err);
});
//start application
app.start();