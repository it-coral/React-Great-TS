import { TEST_ACTION_TYPE } from '../constants/ActionTypes';

export const testAction = (test: string) => {
    return {
        type: TEST_ACTION_TYPE,
        payload: test
    };
};