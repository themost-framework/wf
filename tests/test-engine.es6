import path from 'path';
import {HttpApplication} from '@themost/web/app';
import {EmbeddedProcessEngine} from '../embedded';
describe('test engine', function () {
    /**
     * @type HttpApplication
     */
    let app;
    before((done) => {
        try {
            app = new HttpApplication(path.resolve(process.cwd(), './tests/app/'));
            //use process engine
            app.useService(EmbeddedProcessEngine);
            return done();
        }
        catch(err) {
            return done(err);
        }
    });

    it('should get process instance template', function(done) {
        try {
            app.execute((context)=> {
                context.model('ProcessTemplate').where('alternateName').equal('diagram_1').silent().getItem().then((processTemplate) => {
                    if (typeof processTemplate === 'undefined') {
                        //add process template
                        return context.model('ProcessTemplate').silent().save({
                            "name": "Test Diagram #1",
                            "alternateName": "diagram_1",
                            "url":"./processes/diagram_1.bpmn"
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

    it('should add process instance', function(done) {
        app.execute((context)=> {
            context.model('ProcessInstance').where('sameAs').equal('/test-instance/diagram_1').silent().getItem().then((instance)=> {
                if (typeof instance === 'undefined') {
                    instance = {
                        "template": {
                            "alternateName": "diagram_1"
                        },
                        "sameAs":"/test-instance/diagram_1",
                        "executionDate": new Date(),
                        "status": {
                            "alternateName": "None"
                        },
                    };
                }
                else {
                    /*
                    instance.status = {
                        "alternateName": "None"
                    };
                    */
                }
                return context.model('ProcessInstance').silent().save(instance).then(()=> done());
            }).catch((err)=> done(err));
        });
    });

    it('should load bpmn process', function(done) {
        app.execute((context) => {
            context.model('ProcessInstance').where('sameAs').equal('/test-instance/diagram_1').silent().getItem().then((instance)=> {
                if (typeof instance === 'undefined') {
                    return done(new Error('Process instance not found'));
                }
                app.getService(EmbeddedProcessEngine).load(context, instance, (err)=> {
                    return done(err);
                });
            }).catch((err)=> done(err));
        });
    });
});