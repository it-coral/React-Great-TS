import { AnyAction } from 'redux';
import { AUTHORIZE_USER } from '../constants/ActionTypes';

interface IUserAuthModer {
    user: IUser | null;
}

const defaultState: IUserAuthModer = {
    user: null
};

export default (state: IUserAuthModer = defaultState, action: AnyAction) => {
    switch (action.type) {
        case AUTHORIZE_USER: {
            return {
                ...state,
                user: true,
            };
        }
        default:
            return state;
    }
};