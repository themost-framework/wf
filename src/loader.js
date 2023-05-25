import { FileSchemaLoaderStrategy } from '@themost/data';
import { resolve } from 'path';
/**
 * A schema loader for loading extra data models
 */
class BusinessProcessSchemaLoader extends FileSchemaLoaderStrategy {

    /**
     * @param {ConfigurationBase} config
     */
    constructor(config) {
        super(config);
        // set model path
        this.setModelPath(resolve(__dirname, 'config/models'));
    }

    getModelDefinition(name) {
        const model = super.getModelDefinition.bind(this)(name);
        if (model) {
            if (Array.isArray(model.eventListeners) ) {
                model.eventListeners.forEach(eventListener => {
                    if (eventListener.type.indexOf('.') === 0) {
                        eventListener.type = resolve(__dirname,  eventListener.type);
                    }
                });
            }
            if (model.classPath && model.classPath.indexOf('.')===0) {
                model.classPath= resolve(__dirname, model.classPath);
            }
        }
        return model;
    }
}

export {
    BusinessProcessSchemaLoader
}
