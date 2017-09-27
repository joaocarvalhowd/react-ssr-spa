import React from 'react';

import { expect } from 'chai';
import { StaticRouter } from 'react-router';

import IndexPage from '../../../../../../src/views/containers/pages/index_page/index_page';
import Enzyme from '../../../../utils/enzyme_adapter_util';

const { mount } = Enzyme;

describe('A suite for index page', function() {
  /*
  it('contains the correct class', function correctClass() {
    expect(
      shallow(<StaticRouter context={{}}><IndexPage /></StaticRouter>).find(
        '.index-page'
      ).length
    ).to.equal(1);
  });
  */

  it('contains spec with an expectation', function() {
    expect(
      mount(
        <StaticRouter context={{}}>
          <IndexPage />
        </StaticRouter>
      ).find('.index-page').length
    ).to.equal(1);
  });
});
