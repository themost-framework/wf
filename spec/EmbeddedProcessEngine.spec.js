import { EmbeddedProcessEngine } from '../embedded';

describe('EmbeddedProcessEngine',() => {
    it('should create instance', () => {
        const engine = new EmbeddedProcessEngine();
        expect(engine).toBeTruthy()
    })
})