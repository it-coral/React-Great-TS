import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, GenericStoreEnhancer, compose } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from './reducers';
import 'typeface-roboto';
import App from './App';

const devToolsExtension: GenericStoreEnhancer =
    window['devToolsExtension'] ? // tslint:disable-line
        window['devToolsExtension']() : f => f; // tslint:disable-line

const store = createStore(
    rootReducer,
    compose(applyMiddleware(thunk), devToolsExtension) as GenericStoreEnhancer
);

ReactDOM.render(
    <Provider store={store}>
        <App/>
    </Provider>,
    document.getElementById('root') as HTMLElement
);
