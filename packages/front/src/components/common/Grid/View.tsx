import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import Table, {
    TableBody,
    TableCell,
    TableHead,
    TablePagination,
    TableRow,
} from 'material-ui/Table';
import EnhancedTableHead from './EnhancedTableHead';
import { GridProps, GridState, GridHandlers } from './index';

type StyledComponent = WithStyles<
    'root' |
    'tableWrapper' |
    'table'
>;

type GridViewProps<T extends GridModel> = GridProps & GridState<T> & GridHandlers & StyledComponent;

class GridView<T extends GridModel> extends React.Component<GridViewProps<T>> {
    render() {
        const {
            columnSchema,
            data,
            sort,
            classes,
            onRequestSort,
            onChangePage,
            onChangeRowsPerPage
        } = this.props;

        return (
            <Paper className={classes.root}>
                <div className={classes.tableWrapper}>
                    <Table className={classes.table}>
                        <TableHead>
                            <TableRow>
                                <TablePagination
                                    colSpan={columnSchema.length}
                                    count={data.total}
                                    rowsPerPage={data.limit}
                                    rowsPerPageOptions={[50, 100, 500]}
                                    page={data.page > 0 ? --data.page : data.page}
                                    onChangePage={onChangePage}
                                    onChangeRowsPerPage={onChangeRowsPerPage}
                                />
                            </TableRow>
                        </TableHead>
                        <EnhancedTableHead
                            columnSchema={columnSchema}
                            order={sort.order}
                            orderBy={sort.orderBy}
                            rowCount={data.total}
                            onRequestSort={onRequestSort}
                        />
                        <TableBody>
                            {data.docs.map((model: T) => (
                                <TableRow key={model._id}>
                                {
                                    columnSchema.map(column => (
                                        <TableCell
                                            padding={column.disablePadding ? 'none' : 'default'}
                                            numeric={column.numeric}
                                        >
                                            {model[column.id]}
                                        </TableCell>
                                    ))
                                }
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Paper>
        );
    }
}

const styles = (theme: Theme) => ({
    root: {
        width: '100%'
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    table: {
        minWidth: 800,
    }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<GridProps & GridHandlers>(GridView);