import { AnyAction } from 'redux';
import { TEST_ACTION_TYPE } from '../constants/ActionTypes';

interface TestReducerModel {
    test: String;
}

export default (state: TestReducerModel = {test: ''}, action: AnyAction) => {
    switch (action.type) {
        case TEST_ACTION_TYPE:
            return {
                ...state,
                test: {
                    ...state.test,
                    test: action.payload
                }
            };
        default:
            return state;
    }
};