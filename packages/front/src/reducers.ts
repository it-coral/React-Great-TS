import { combineReducers } from 'redux';

import userAuthReducer from './reducers/userAuthReducer';
import dictionaryReducer from './reducers/dictionaryReducer';

const rootReducer = combineReducers({
    userAuth: userAuthReducer,
    dictionary: dictionaryReducer,
});

export default rootReducer;