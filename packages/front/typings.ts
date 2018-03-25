declare module '*';

interface IRouterProps {
    user: IUser;
}

interface IStore {
    userAuth: IUserAuth;
}

interface IUserAuth {
    user: IUser;
}

interface IUser {
    name: string;
    email: string;
}
