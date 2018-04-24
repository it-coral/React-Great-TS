declare module '*';

type SortValueType = 'asc' | 'desc';

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

interface NavBarProps {
    a: string;
    handleDrawerToggle(): void;
}

interface GridModel {
    _id: string | number;
}

interface TestModel extends GridModel {
    info: string;
    isRemote: boolean;
    lastRunDate: Date;
    name: string;
    runCount: number;
    serviceUrl: string;
}

interface SortDescriptor {
    order: SortValueType;
    orderBy: string;
}

interface ColumnSchema {
    id: string;
    numeric: boolean;
    disablePadding: boolean;
    label: string;
    sortable?: boolean;
    style?: object;
    // tslint:disable-next-line:no-any
    render?: (data: object | string) => any;
}

interface DataDescriptor<T extends GridModel> {
    docs: Array<T>;
    limit: number;
    page: number;
    pages?: number;
    total: number;
}

interface DataFetchDescriptor {
    limit: number;
    page: number;
    order: string;
    search?: string;
}