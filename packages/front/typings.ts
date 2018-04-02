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
    role: string;
    phone: string;
    company: string;
    email: string;
}
