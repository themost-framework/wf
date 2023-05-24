import { EmbeddedProcessEngine } from '../embedded';
import { BusinessProcessSchemaLoader } from '../loader';
import { SchemaLoaderStrategy } from '@themost/data';
import { getApplication } from '@themost/test';

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
})