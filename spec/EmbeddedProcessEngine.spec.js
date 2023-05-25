import { EmbeddedProcessEngine, BusinessProcessSchemaLoader, ProcessTemplate, ProcessInstance } from '@themost/wf';
import { SchemaLoaderStrategy } from '@themost/data';
import { getApplication } from '@themost/test';
import { TraceUtils } from '@themost/common';

describe('EmbeddedProcessEngine',() => {
    /**
     * @type {import('@themost/express').ExpressDataContext}
     */
    let context;
    beforeAll(() => {
        const container = getApplication();
        /**
         * @type {import('@themost/express').ExpressDataApplication}
         */
        const app = container.get('ExpressDataApplication');
        /**
         * @type {import('@themost/data').DefaultSchemaLoaderStrategy}
         */
        const strategy = app.getConfiguration().getStrategy(SchemaLoaderStrategy);
        strategy.loaders.push(new BusinessProcessSchemaLoader(app.getConfiguration()))
        context = app.createContext();
    })
    afterAll(async () => {
        await context.finalizeAsync();
    })

    it('should create instance', async () => {
        const engine = new EmbeddedProcessEngine(context.application);
        expect(engine).toBeTruthy();
        const items = await context.model('ProcessStatusType').getItems();
        expect(items).toBeTruthy();
    })

    it('should start and stop engine', async () => {
        const engine = new EmbeddedProcessEngine(context.application);
        expect(engine.intervalTimer).toBeFalsy();
        engine.interval = 3000;
        engine.start();
        expect(engine.intervalTimer).toBeTruthy();
        engine.stop();
        expect(engine.intervalTimer).toBeFalsy();
        expect(engine.started).toBeFalsy();
    });

    it('should add process template', async () => {
        await context.model(ProcessTemplate).silent().save({
            'name': 'Sample Diagram 1',
            'alternateName': 'diagram_1',
            'url': 'spec/bpmn/diagram_1.bpmn'
        });
        const item = await context.model(ProcessTemplate).where('alternateName').equal('diagram_1').silent().getItem();
        expect(item).toBeTruthy();
    });

    it('should start process', async () => {
        await context.model(ProcessTemplate).silent().save({
            'name': 'Sample Diagram 1',
            'alternateName': 'diagram_1',
            'url': 'spec/bpmn/diagram_1.bpmn'
        });
        const newItem = {
            status: {
                name: 'None'
            },
            template: {
                alternateName: 'diagram_1'
            },
            executionDate: new Date()
        }
        await context.model(ProcessInstance).silent().save(newItem);
        const engine = new EmbeddedProcessEngine(context.application);
        expect(engine.intervalTimer).toBeFalsy();
        engine.interval = 3000;
        engine.start();
        TraceUtils.debug('Waiting engine interval');
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, engine.interval + 5000)
        });
        const item = await context.model(ProcessInstance).where('id').equal(newItem.id).silent().getItem();
        expect(item).toBeTruthy();
        expect(item.status.name).toEqual('Succeeded')

    });

})