import { SET_DISTINCT_TESTS } from '../constants/ActionTypes';
import { ISetTestsDistinctAction } from '../actions/dictionaryAction';

const defaultState: DictionaryReducerModel = {
    testRuns: []
};

export default (state: DictionaryReducerModel = defaultState, action: ISetTestsDistinctAction) => {
    switch (action.type) {
        case SET_DISTINCT_TESTS: {
            return {
                ...state,
                testRuns: action.payload,
            };
        }
        default:
            return state;
    }
};