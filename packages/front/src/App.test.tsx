import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import withStore from './testHelpers/withStore';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(withStore(<App />), div);
});
