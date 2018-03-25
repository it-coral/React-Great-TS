import { createStore, applyMiddleware, GenericStoreEnhancer, compose } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from './reducers';

const devToolsExtension: GenericStoreEnhancer =
    window['devToolsExtension'] ? // tslint:disable-line
        window['devToolsExtension']() : f => f; // tslint:disable-line

// TODO: Check if we can replace redux completly by Apollo in the future
export default createStore(
    rootReducer,
    compose(applyMiddleware(thunk), devToolsExtension) as GenericStoreEnhancer
);