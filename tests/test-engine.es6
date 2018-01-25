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
        try {
            app = new HttpApplication(path.resolve(process.cwd(), './tests/app/'));
            engine = new EmbeddedProcessEngine(app);
            return done();
        }
        catch(err) {
            return done(err);
        }
    });

    it('should get process instance template', function(done) {
        try {
            engine.application.execute((context)=> {
                context.model('ProcessTemplate').where('alternateName').equal('diagram_1').silent().getItem().then((processTemplate) => {
                    if (typeof processTemplate === 'undefined') {
                        //add process template
                        return context.model('ProcessTemplate').silent().save({
                            "name": "Test Diagram #1",
                            "alternateName": "diagram_1",
                            "url":"./tests/app/processes/diagram_1.bpmn"
                        }).then(()=> {
                            context.finalize(()=> {
                                return done();
                            });
                        });
                    }
                    context.finalize(()=> {
                        return done();
                    });
                }).catch((err)=> {
                    context.finalize(()=> {
                        return done(err);
                    });
                });
            });
        }
        catch(err) {
            return done(err);
        }

    });

    it('should load bpmn process', function(done) {
        app.execute((context) => {
            context.finalize(()=> {
                return done();
            });
        });
    });
});