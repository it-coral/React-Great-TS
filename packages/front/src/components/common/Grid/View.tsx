import * as React from 'react';
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
import Typography from 'material-ui/Typography';
import SearchToolbar from './SearchToolbar';
import { CircularProgress } from 'material-ui/Progress';
import Grid from 'material-ui/Grid';

type StyledComponent = WithStyles<'tableWrapper' |
  'table' |
  'searchField' |
  'margin' |
  'searchCell' |
  'noRowsCell' |
  'tableRowItem' |
  'searchBtn' |
  'progress'>;

type GridViewProps<T extends GridModel> = GridProps<T> & GridState<T> & GridHandlers;

class GridView<T extends GridModel> extends React.Component<GridViewProps<T> & StyledComponent> {
  render() {
    const {
      columnSchema,
      data,
      sort,
      search,
      pagination,
      searchByLabel,
      classes,
      onRequestSort,
      onChangePage,
      onChangeRowsPerPage,
      onSubmitFilterSearch,
      onRowClick,
      filters,
      dataPending,
      rowProps
    } = this.props;

    return (
      <div className={classes.tableWrapper}>
        <Table className={classes.table}>
          {(search || pagination) &&
            <TableHead>
              <TableRow>
                <TableCell colSpan={columnSchema.length}>
                  <Grid container={true}>
                    <Grid item={true} xs={7}>
                      {search &&
                      <SearchToolbar
                        onSubmit={onSubmitFilterSearch}
                        placeholder={`Search by ${searchByLabel}`}
                        colSpan={(columnSchema.length / 2) + 1}
                        filters={filters}
                      />
                      }
                    </Grid>

                    {pagination &&
                    <Grid item={true} xs={5}>
                      <TablePagination
                        colSpan={(columnSchema.length / 2) - 1}
                        count={data.total}
                        rowsPerPage={data.limit}
                        rowsPerPageOptions={[50, 100, 500]}
                        page={data.page > 0 ? --data.page : data.page}
                        onChangePage={onChangePage}
                        onChangeRowsPerPage={onChangeRowsPerPage}
                        component={'div'}
                      />
                    </Grid>
                    }
                  </Grid>
                </TableCell>
              </TableRow>
            </TableHead>
          }
          <EnhancedTableHead
            columnSchema={columnSchema}
            order={sort.order}
            orderBy={sort.orderBy}
            rowCount={data.total}
            onRequestSort={onRequestSort}
          />
          <TableBody>
            {data.docs.length > 0 ? data.docs.map((model: T, i: number) => (
              <TableRow
                onClick={(e) => onRowClick ? onRowClick(e, model) : undefined}
                className={classes.tableRowItem}
                key={i}
                {...rowProps}
              >
                {
                  columnSchema.map((column: ColumnSchema, index: number) => (
                    <TableCell
                      key={index}
                      padding={column.disablePadding ? 'none' : 'default'}
                      numeric={column.numeric}
                      style={column.style}
                    >
                      {this.cellRender(model, column)}
                    </TableCell>
                  ))
                }
              </TableRow>
            )) : <tr>
              <td className={classes.noRowsCell} colSpan={columnSchema.length}>
                {!dataPending ?
                  <Typography align="center">No rows to show</Typography> :
                  <CircularProgress className={classes.progress}/>
                }
              </td>
            </tr>}
          </TableBody>
        </Table>
      </div>
    );
  }

  private cellRender(model: T, column: ColumnSchema) {
    if (!column.isObject) {
      return column.render ? column.render(model) : model[column.id];
    } else {
      let value = column.id.split('.').reduce((a, b) => a ? a[b] : null, model);
      return column.render ? column.render(value) : value;
    }
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
  },
  searchBtn: {
    width: 30,
    height: 30
  },
  progress: {
    margin: `${theme.spacing.unit * 2}px auto`,
    display: 'block'
  }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<GridViewProps<GridModel>>(GridView);