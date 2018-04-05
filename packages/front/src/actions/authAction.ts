import { AUTHORIZE_USER } from '../constants/ActionTypes';
import AxiosFactory from '../services/AxiosFactory';
import ApiPath from '../constants/ApiPath';
import { Dispatch } from 'redux';
import { ThunkAction } from 'redux-thunk';

export interface ISetUserAction {
    type: string;
    payload: User;
}

export const SetUserAction = (data: User): ISetUserAction => {
    return {
        type: AUTHORIZE_USER,
        payload: data,
    };
};

export const FetchUser = (): ThunkAction<void, IStore, null> => (dispatch: Dispatch<IStore>) => {
    let axiosFactory = new AxiosFactory();

    return axiosFactory.axios.get(ApiPath.api.userInfo)
        .then(res => {
            dispatch(SetUserAction(res.data));
        });
};