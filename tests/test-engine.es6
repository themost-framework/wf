import path from 'path';
import {HttpApplication} from '@themost/web/app';
import {EmbeddedProcessEngine} from '../embedded';
describe('test engine', function () {
    /**
     * @type HttpApplication
     */
    let app;
    /**
     * @type EmbeddedProcessEngine
     */
    let engine;
    before((done) => {
        app = new HttpApplication(path.resolve(process.cwd(), './tests/app/'));
        engine = new EmbeddedProcessEngine(app);
        return done();
    });

    it.only('should get process instance template', (done)=> {
        engine.application.execute((context)=> {
           context.model('ProcessTemplate').where('alternateName').equal('diagram_1').silent().getItems().then((processTemplate) => {
               if (typeof processTemplate === 'undefined') {
                   //add process template
                   return context.model('ProcessTemplate').save({
                       "name": "Test Diagram #1",
                       "alternateName": "diagram_1",
                       "url":"./tests/app/processes/diagram_1.bpmn"
                   }).then(()=> {
                       return done();
                   });
               }
               return done();
           }).catch((err)=> {
               return done(err);
           });
        });
    });

    it('should load bpmn process', (done)=> {
        app.execute((context) => {
           engine.load(context, {

           }, (err)=> {
               return done(err);
           });
        });
    });
});