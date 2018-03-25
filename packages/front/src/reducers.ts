import { combineReducers } from 'redux';

import userAuthReducer from './reducers/userAuthReducer';

const rootReducer = combineReducers({
    userAuth: userAuthReducer,
});

export default rootReducer;