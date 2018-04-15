import * as React from 'react';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
} from 'material-ui/Table';
import TextField from 'material-ui/TextField';
import EnhancedTableHead from './EnhancedTableHead';
import { GridProps, GridState, GridHandlers } from './index';
import Button from 'material-ui/Button';
import Search from 'material-ui-icons/Search';
import Cancel from 'material-ui-icons/Cancel';
import Typography from 'material-ui/Typography';

type StyledComponent = WithStyles<
  'tableWrapper' |
  'table' |
  'searchField' |
  'margin' |
  'searchCell' |
  'noRowsCell' |
  'tableRowItem'
>;

type GridViewProps<T extends GridModel> = GridProps & GridState<T> & GridHandlers & StyledComponent;

class GridView<T extends GridModel> extends React.Component<GridViewProps<T>> {
  render() {
    const {
      columnSchema,
      data,
      sort,
      search,
      searchByLabel,
      searchValue,
      onSearchChange,
      classes,
      onRequestSort,
      onChangePage,
      onChangeRowsPerPage,
      onResetSearch,
      onApplySearch,
      onRowClick
    } = this.props;

    return (
      <div className={classes.tableWrapper}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              {search &&
                <TableCell
                  className={classes.searchCell}
                >
                  <form onSubmit={onApplySearch}>
                    <TextField
                      value={searchValue}
                      onChange={onSearchChange}
                      className={classes.searchField}
                      placeholder={`Search by ${searchByLabel}`}
                    />
                    {searchValue &&
                    <Button
                      className={classes.margin}
                      mini={true}
                      variant="fab"
                      color="primary"
                      aria-label="clear"
                      onClick={onResetSearch}
                    >
                      <Cancel />
                    </Button>}
                    <Button
                      className={classes.margin}
                      mini={true}
                      variant="fab"
                      color="primary"
                      type="submit"
                      aria-label="search"
                    >
                      <Search />
                    </Button>
                  </form>
                </TableCell>
              }
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
            {data.docs.length > 0 ? data.docs.map((model: T) => (
              <TableRow
                onClick={(e) => onRowClick ? onRowClick(e, model) : undefined}
                className={classes.tableRowItem}
                key={model._id}
              >
                {
                  columnSchema.map(column => (
                    <TableCell
                      key={model._id + column.id}
                      padding={column.disablePadding ? 'none' : 'default'}
                      numeric={column.numeric}
                      style={column.style}
                    >
                      {column.render ? column.render(model[column.id]) : model[column.id]}
                    </TableCell>
                  ))
                }
              </TableRow>
            )) : <td className={classes.noRowsCell} colSpan={columnSchema.length}>
              <Typography align="center">No rows to show</Typography>
            </td>}
          </TableBody>
        </Table>
      </div>
    );
  }
}

const styles = (theme: Theme) => ({
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    minWidth: 800,
  },
  tableRowItem: {
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: '#f7f7f7'
    }
  },
  searchField: {
    width: 245,
    marginRight: theme.spacing.unit
  },
  margin: {
    marginRight: theme.spacing.unit
  },
  noRowsCell: {
    padding: theme.spacing.unit * 3,
    color: 'rgba(0, 0, 0, 0.54)'
  },
  searchCell: {
    paddingRight: 0,
    minWidth: 373
  }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<GridProps & GridHandlers>(GridView);