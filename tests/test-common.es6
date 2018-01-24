import {assert} from 'chai';
import path from 'path';
import {XDocument} from '@themost/xml/index';
describe('common tests', () => {
   it('should open bpmn xml file', (done) => {
       XDocument.load(path.resolve(__dirname, './diagram_1.bpmn'), (err, document) => {
           if (err) {
               return done(err);
           }
           assert.equal(document.documentElement.getAttribute('xmlns:bpmn'),'http://www.omg.org/spec/BPMN/20100524/MODEL');
           return done();
       });
   });
});

