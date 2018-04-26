import { SET_DISTINCT_TESTS } from '../constants/ActionTypes';
import AxiosFactory from '../services/AxiosFactory';
import ApiPath from '../constants/ApiPath';
import { Dispatch } from 'redux';
import { ThunkAction } from 'redux-thunk';

export interface ISetTestsDistinctAction {
    type: string;
    payload: Array<string>;
}

export const SetTestsDistinct = (data: Array<string>): ISetTestsDistinctAction => {
    return {
        type: SET_DISTINCT_TESTS,
        payload: data,
    };
};

export const FetchTestsDistinct = (): ThunkAction<void, IStore, null> => (dispatch: Dispatch<IStore>) => {
    let axiosFactory = new AxiosFactory();

    return axiosFactory.axios.get(`${ApiPath.api.testRunsDistinct}?order=test_run_sort`)
        .then(res => {
            dispatch(SetTestsDistinct(res.data));
        });
};