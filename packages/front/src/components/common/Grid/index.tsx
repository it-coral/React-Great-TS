import * as React from 'react';
import View from './View';
import AxiosFactory from '../../../services/AxiosFactory';
import { AxiosResponse } from 'axios';

export interface GridProps {
  columnSchema: Array<ColumnSchema>;
  apiRoute: string;
  defaultSort: SortDescriptor;
  search?: boolean;
  searchByLabel?: string;
  onRowClick: (e: React.MouseEvent<HTMLTableRowElement>, dataItem: GridModel) => void;
}

export interface GridState<T extends GridModel> {
  data: DataDescriptor<T>;
  sort: SortDescriptor;
  searchValue: string;
}

export interface GridHandlers {
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestSort: (e: React.MouseEvent<HTMLInputElement>, property: string) => void;
  onChangePage: (e: React.MouseEvent<HTMLInputElement>, pageNumber: number) => void;
  onChangeRowsPerPage: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onResetSearch: () => void;
  onApplySearch: (e: React.FormEvent<HTMLFormElement>) => void;
  onRowClick: (e: React.MouseEvent<HTMLTableRowElement>, dataItem: GridModel) => void;
}

export class Grid<T extends GridModel> extends React.Component<GridProps, GridState<T>> {
  handlers: GridHandlers;
  defaultState: GridState<T>;

  constructor(props: GridProps) {
    super(props);

    this.defaultState = {
      data: {
        docs: [],
        total: 0,
        limit: 50,
        page: 0,
      },
      sort: {
        order: props.defaultSort.order || '',
        orderBy: props.defaultSort.orderBy || ''
      },
      searchValue: ''
    };

    this.state = this.defaultState;

    this.onRequestSort = this.onRequestSort.bind(this);
    this.onChangePage = this.onChangePage.bind(this);
    this.onChangeRowsPerPage = this.onChangeRowsPerPage.bind(this);
    this.onSearchChange = this.onSearchChange.bind(this);
    this.onResetSearch = this.onResetSearch.bind(this);
    this.onApplySearch = this.onApplySearch.bind(this);
    this.onRowClick = this.onRowClick.bind(this);

    this.handlers = {
      onRequestSort: this.onRequestSort,
      onChangePage: this.onChangePage,
      onChangeRowsPerPage: this.onChangeRowsPerPage,
      onSearchChange: this.onSearchChange,
      onResetSearch: this.onResetSearch,
      onApplySearch: this.onApplySearch,
      onRowClick: this.onRowClick
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
        page: config.page,
        search: this.state.searchValue
      }
    }).then((res: AxiosResponse) => {
      this.setState({
        data: res.data
      });
    });
  }

  onApplySearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const searchValue = this.state.searchValue;
    this.setState({
      ...this.defaultState,
      searchValue
    },            () => {
      this.fetchListInfo({
        page: this.state.data.page,
        limit: this.state.data.limit,
        order: this.getSortOrder(),
        search: this.state.searchValue
      });
    });
  }

  onResetSearch() {
    this.setState(this.defaultState, () => {
      this.fetchListInfo({
        page: this.state.data.page,
        limit: this.state.data.limit,
        order: this.getSortOrder()
      });
    });
  }

  onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      searchValue: e.currentTarget.value
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

  onRowClick(e: React.MouseEvent<HTMLTableRowElement>, dataItem: T) {
    this.props.onRowClick(e, dataItem);
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
