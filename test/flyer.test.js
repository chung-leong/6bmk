import { expect } from 'chai';
import { countSyllables } from './count-syllables.js';
import { Dictionary } from '../src/dictionary.js';
import { ZipFile } from '../src/zip.js';

import {
  modifyFlyerXML,
} from '../src/flyer.js';
import {
  createFlyer,
} from '../index.js';

describe('Flyer creation', function() {
  describe('#modifyFlyerXML', function() {
    it('should ignore files that is not slide#.xml', function() {
      const result1 = modifyFlyerXML('docProps/core.xml');
      const result2 = modifyFlyerXML('ppt/slideLayouts/slideLayout8.xml');
      expect(result1).to.be.undefined;
      expect(result2).to.be.undefined;
    })
    it('should throw when not haiku generator is given', function() {
      const f = () => {
        modifyFlyerXML('ppt/slides/slide1.xml', {}, '', '');
      };
      expect(f).to.throw();
    })
  })
})