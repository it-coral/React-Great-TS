import { combineReducers } from 'redux';

import userAuthReducer from './reducers/userAuthReducer';
import testReducer from './reducers/testReducer';

const rootReducer = combineReducers({
    test: testReducer,
    userAuth: userAuthReducer,
});

export default rootReducer;