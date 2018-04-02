import { AUTHORIZE_USER } from '../constants/ActionTypes';
import { ISetUserAction } from '../actions/authAction';

interface IUserAuthModer {
    user: User | null;
}

const defaultState: IUserAuthModer = {
    user: null
};

export default (state: IUserAuthModer = defaultState, action: ISetUserAction) => {
    switch (action.type) {
        case AUTHORIZE_USER: {
            return {
                ...state,
                user: action.payload,
            };
        }
        default:
            return state;
    }
};