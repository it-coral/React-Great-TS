import { AnyAction } from 'redux';
interface IUserAuthModer {
    user: IUser | null;
}

const defaultState: IUserAuthModer = {
    user: null
};

export default (state: IUserAuthModer = defaultState, action: AnyAction) => {
    switch (action.type) {
        default:
            return state;
    }
};