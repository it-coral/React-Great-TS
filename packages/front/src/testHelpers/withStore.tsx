import * as React from 'react';
import { Provider } from 'react-redux';
import store from '../store';

export default (child: React.ReactElement<{}>) => <Provider store={store}><child.type {...child.props} /></Provider>;
