declare module '*';

interface RouterProps {
    user: User;
}

interface IStore {
    userAuth: UserAuth;
}

interface UserAuth {
    user: User;
}

interface User {
    name: string;
    email: string;
}
