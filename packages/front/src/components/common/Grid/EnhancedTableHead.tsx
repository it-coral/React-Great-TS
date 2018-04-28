import * as React from 'react';
import {
    TableHead,
    TableCell,
    TableSortLabel,
    TableRow,
} from 'material-ui/Table';
import Tooltip from 'material-ui/Tooltip';

interface EnhancedTableHeadProps {
    onRequestSort: (e: React.MouseEvent<HTMLInputElement>, property: string) => void;
    order?: SortValueType;
    orderBy?: string;
    selectable?: string;
    rowCount?: number;
    disablePadding?: boolean;
    columnSchema: Array<ColumnSchema>;
}

export default class EnhancedTableHead extends React.Component<EnhancedTableHeadProps> {
    constructor(props: EnhancedTableHeadProps) {
        super(props);

        this.createSortHandler = this.createSortHandler.bind(this);
    }

    createSortHandler(property: string) {
        return (event: React.MouseEvent<HTMLInputElement>) => {
            this.props.onRequestSort(event, property);
        };
    }

    render() {
        const {
            order,
            orderBy,
            columnSchema,
        } = this.props;

        return (
            <TableHead>
                <TableRow>
                    {columnSchema.map((column: ColumnSchema) => {
                        return (
                            <TableCell
                                key={column.id}
                                numeric={column.numeric}
                                padding={column.disablePadding ? 'none' : 'default'}
                                sortDirection={column.sortable !== false && orderBy === column.id ? order : false}
                            >
                                {column.sortable !== false ? <Tooltip
                                    title="Sort"
                                    placement={column.numeric ? 'bottom-end' : 'bottom-start'}
                                    enterDelay={300}
                                >
                                    <TableSortLabel
                                        active={orderBy === column.id}
                                        direction={order}
                                        onClick={this.createSortHandler(column.id)}
                                    >
                                        {column.labelRender ? column.labelRender() : column.label}
                                    </TableSortLabel>
                                </Tooltip> :
                                    column.labelRender ? column.labelRender() : column.label
                                }
                            </TableCell>
                        );
                    })}
                </TableRow>
            </TableHead>
        );
    }
}
