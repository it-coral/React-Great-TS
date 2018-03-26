import { AUTHORIZE_USER } from '../constants/ActionTypes';

export interface IAuthorizeAction {
    type: string;
}

export const AuthorizeAction = (): IAuthorizeAction => {
    return {
        type: AUTHORIZE_USER,
    };
};