import { AnyAction } from 'redux';
import { TEST_ACTION_TYPE } from '../constants/ActionTypes';

interface ITestReducerModel {
    test: String;
}

export default (state: ITestReducerModel = {test: ''}, action: AnyAction) => {
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