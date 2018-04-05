import * as React from 'react';
import View from './View';
import AxiosFactory from '../../../services/AxiosFactory';
import { AxiosResponse } from 'axios';

export interface GridProps {
    columnSchema: Array<ColumnSchema>;
    apiRoute: string;
    defaultSort: SortDescriptor;
}

export interface GridState<T extends GridModel> {
    data: DataDescriptor<T>;
    sort: SortDescriptor;
}

export interface GridHandlers {
    onRequestSort: (e: React.MouseEvent<HTMLInputElement>, property: string) => void;
    onChangePage: (e: React.MouseEvent<HTMLInputElement>, pageNumber: number) => void;
    onChangeRowsPerPage: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export class Grid<T extends GridModel> extends React.Component<GridProps, GridState<T>> {
    handlers: GridHandlers;

    constructor(props: GridProps) {
        super(props);

        this.state = {
            data: {
                docs: [],
                total: 0,
                limit: 50,
                page: 0,
            },
            sort: {
                order: props.defaultSort.order || '',
                orderBy: props.defaultSort.orderBy || ''
            }
        };

        this.onRequestSort = this.onRequestSort.bind(this);
        this.onChangePage = this.onChangePage.bind(this);
        this.onChangeRowsPerPage = this.onChangeRowsPerPage.bind(this);

        this.handlers = {
            onRequestSort: this.onRequestSort,
            onChangePage: this.onChangePage,
            onChangeRowsPerPage: this.onChangeRowsPerPage
        };
    }

    componentDidMount() {
        this.fetchListInfo({
            page: this.state.data.page,
            limit: this.state.data.limit,
            order: this.getSortOrder()
        });
    }

    fetchListInfo(config: DataFetchDescriptor) {
        let axiosFactory = new AxiosFactory();
        return axiosFactory.axios.get(this.props.apiRoute, {
            params: {
                order: config.order,
                limit: config.limit,
                page: config.page
            }
        }).then((res: AxiosResponse) => {
            this.setState({
                data: res.data
            });
        });
    }

    onRequestSort(e: React.MouseEvent<HTMLInputElement>, property: string) {
        this.fetchListInfo({
            page: 1,
            limit: this.state.data.limit,
            order: this.getSortOrder(property),
        });
    }

    onChangePage(e: React.MouseEvent<HTMLInputElement>, pageNumber: number) {
        this.fetchListInfo({
            page: ++pageNumber,
            limit: this.state.data.limit,
            order: this.getSortOrder()
        });
    }

    onChangeRowsPerPage(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        this.fetchListInfo({
            page: 1,
            limit: parseInt(e.target.value, 10),
            order: this.getSortOrder()
        });
    }

    getSortOrder(property?: string): string {
        if (!property) {
            return `${this.state.sort.order === 'asc' ? '' : '-'}${this.state.sort.orderBy}`;
        }
        let order = 'desc';

        if (this.state.sort.orderBy === property && this.state.sort.order === 'desc') {
            order = 'asc';
        }

        this.setState({
            sort: {
                order: order as SortValueType,
                orderBy: property
            }
        });

        return order === 'asc' ? property : `-${property}`;
    }

    render() {
        return (
            <View
                {...this.props}
                {...this.state}
                {...this.handlers}
            />
        );
    }
}
