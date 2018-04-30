import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import IconButton from 'material-ui/IconButton';
import * as moment from 'moment';
import { Grid } from '../../components/common/Grid';
import ApiPath from '../../constants/ApiPath';
import GridToolbar from './GridToolbar';
import { RouteComponentProps } from 'react-router';
import { TestProperty } from '../../constants/RoutesNames';
import ModeEdit from '@material-ui/icons/ModeEdit';
import ContentCopy from '@material-ui/icons/ContentCopy';
import PlayArrow from '@material-ui/icons/PlayArrow';
import Tooltip from 'material-ui/Tooltip';
import AxiosFactory from '../../services/AxiosFactory';
import { AxiosResponse } from 'axios';

type StyledComponent = WithStyles<
  'root' |
  'tableRowItemHover' |
  'hoverActionBtnStyle'
>;

export class GridControl extends React.Component<RouteComponentProps<{}> & StyledComponent> {

  columnSchema: Array<ColumnSchema> = [
    {
      id: 'name', numeric: false, disablePadding: false, label: 'Name',
      // tslint:disable-next-line:no-any
      render: (dataItem: any) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{dataItem.name}</span>
          <div
            style={{
              minWidth: 145
            }}
          >
            <Tooltip
              title="Edit"
              placement="top"
            >
              <IconButton
                className={this.props.classes.hoverActionBtnStyle}
                onClick={(e) => this.onEditButtonClick(e, dataItem)}
              >
                <ModeEdit />
              </IconButton>
            </Tooltip>
            <Tooltip
              title="Duplicate"
              placement="top"
            >
              <IconButton
                className={this.props.classes.hoverActionBtnStyle}
                onClick={(e) => this.onDuplicateButtonClick(e, dataItem)}
              >
                <ContentCopy />
              </IconButton>
            </Tooltip>
            <Tooltip
              title="Run"
              placement="top"
            >
              <IconButton
                className={this.props.classes.hoverActionBtnStyle}
                onClick={(e) => this.onRunButtonClick(e, dataItem)}
              >
                <PlayArrow />
              </IconButton>
            </Tooltip>
          </div>
        </div>),
    },
    { id: 'info', numeric: false, disablePadding: true, label: 'Description', sortable: false },
    { id: 'runCount', numeric: true, disablePadding: false, label: 'Run Count' },
    {
      id: 'lastRunDate', numeric: false, disablePadding: false, label: 'Last Run',
      // tslint:disable-next-line:no-any
      render: (dataItem: any) => dataItem.date ? moment(dataItem.date).format('MMM DD, YYYY - HH:mm') : 'never',
      style: {
        whiteSpace: 'nowrap'
      }
    }
  ];

  constructor(props: RouteComponentProps<{}> & WithStyles<'root'>) {
    super(props);

    this.onRowClick = this.onRowClick.bind(this);
  }

  // tslint:disable-next-line:no-any
  onEditButtonClick(e: React.MouseEvent<HTMLElement>, dataItem: any) {
    e.preventDefault();
    e.stopPropagation();
    this.props.history.push(`${TestProperty}/${dataItem._id}`);
    return false;
  }

  // tslint:disable-next-line:no-any
  onDuplicateButtonClick(e: React.MouseEvent<HTMLElement>, dataItem: any) {
    e.preventDefault();
    e.stopPropagation();
    let axiosFactory = new AxiosFactory();
    axiosFactory.axios.get(`${ApiPath.api.copy}/${dataItem._id}`).then((res: AxiosResponse) => {
      this.props.history.push(`${TestProperty}/${res.data._id}`);
    });
    return false;
  }

  // tslint:disable-next-line:no-any
  onRunButtonClick(e: React.MouseEvent<HTMLElement>, dataItem: any) {
    e.preventDefault();
    e.stopPropagation();
    let axiosFactory = new AxiosFactory();
    axiosFactory.axios.get(`${ApiPath.api.run}/${dataItem._id}`);
    return false;
  }

  onRowClick(e: React.MouseEvent<HTMLTableRowElement>, dataItem: GridModel) {
    this.props.history.push(`${TestProperty}/${dataItem._id}`);
  }

  render() {
    const { classes } = this.props;

    return (
      <Paper className={classes.root}>
        <GridToolbar />
        <Grid
          onRowClick={this.onRowClick}
          search={true}
          remoteDataBound={true}
          searchByLabel={'name/description'}
          apiRoute={ApiPath.api.testDefinitions}
          columnSchema={this.columnSchema}
          defaultSort={{
            order: 'desc',
            orderBy: 'lastRunDate'
          }}
          rowProps={{
            className: classes.tableRowItemHover
          }}
          pagination={true}
        />
      </Paper>
    );
  }
}

const styles = (theme: Theme) => ({
  root: {
    width: '100%'
  },
  tableRowItemHover: {
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: '#f7f7f7',
      '& button': {
        visibility: 'visible',
        pointerEvents: 'all'
      }
    }
  },
  hoverActionBtnStyle: {
    width: 35,
    minWidth: 35,
    height: 35,
    minHeight: 35,
    color: theme.palette.primary.main,
    visibility: 'hidden',
    pointerEvents: 'none'
  }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<{}>(GridControl);