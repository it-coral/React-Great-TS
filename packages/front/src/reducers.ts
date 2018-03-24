import { combineReducers } from 'redux';

import testReducer from './reducers/testReducer';

const rootReducer = combineReducers({
    test: testReducer,
});

export default rootReducer;