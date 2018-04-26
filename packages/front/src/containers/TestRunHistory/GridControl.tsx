import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import { Grid } from '../../components/common/Grid';
import ApiPath from '../../constants/ApiPath';
import { RouteComponentProps } from 'react-router';
import { TestRunDetails } from '../../constants/RoutesNames';
import Flag from 'material-ui-icons/Flag';
import Build from 'material-ui-icons/Build';
import Done from 'material-ui-icons/Done';
import DoneAll from 'material-ui-icons/DoneAll';
import ExitToApp from 'material-ui-icons/ExitToApp';
import Replay from 'material-ui-icons/Replay';
import PlayArrow from 'material-ui-icons/PlayArrow';
import RemoveCircle from 'material-ui-icons/RemoveCircle';
import Warning from 'material-ui-icons/Warning';
import Error from 'material-ui-icons/Error';
import Timer from 'material-ui-icons/Timer';
import * as moment from 'moment';
import { ReactNode } from 'react';
import Tooltip from 'material-ui/Tooltip';

const tooltipHelper = (title: string, icon: ReactNode): ReactNode => {
    return <Tooltip title={title}>{React.createElement('div', null, icon)}</Tooltip>;
};

const columnSchema: Array<ColumnSchema> = [
    {id: 'manual', numeric: false, disablePadding: false, label: 'Manual'},
    {
        id: 'status', numeric: false, disablePadding: false, label: 'Status',
        labelRender: () => <Flag/>,
        render: (status: string) => {
            switch (status) {
                case 'warnings':
                    return tooltipHelper('Warnings', <Warning/>);
                case 'error':
                    return tooltipHelper('Error', <RemoveCircle/>);
                case 'failure':
                    return tooltipHelper('Failure', <Error/>);
                case 'timeout':
                    return tooltipHelper('Timeout', <Timer/>);
                case 'completed':
                    return tooltipHelper('Completed', <DoneAll/>);
                case 'service-failure':
                    return tooltipHelper('Service failure', <Build/>);
                case 'terminated':
                    return tooltipHelper('Done', <Done/>);
                case 'started':
                    return tooltipHelper('Started', <PlayArrow/>);
                case 'retry':
                    return tooltipHelper('Replay', <Replay/>);
                case 'dismissed':
                    return tooltipHelper('Dismissed', <ExitToApp/>);
                default:
                    return <div>{status}</div>;
            }
        }
    },
    {id: 'name', numeric: false, disablePadding: true, label: 'Name'},
    {id: 'runName', numeric: false, disablePadding: false, label: 'Machines'},
    {id: 'parameters.loopCount', numeric: true, disablePadding: false, label: 'Iterations', isObject: true},
    {id: 'parameters.concurrentUsers', numeric: true, disablePadding: false, label: 'Probes', isObject: true},
    {
        id: 'createDate', numeric: false, disablePadding: false, label: 'Time',
        render: (date) => date ? moment(date).format('MMM DD, YYYY - HH:mm') : 'never',
        style: {
            whiteSpace: 'nowrap'
        }
    },
    {id: 'textError', numeric: false, disablePadding: false, label: 'Reason'},
];

export class GridControl extends React.Component<RouteComponentProps<{}> & WithStyles<'root'>> {
    constructor(props: RouteComponentProps<{}> & WithStyles<'root'>) {
        super(props);

        this.onRowClick = this.onRowClick.bind(this);
    }

    onRowClick(e: React.MouseEvent<HTMLTableRowElement>, dataItem: GridModel) {
        this.props.history.push(`${TestRunDetails}/${dataItem._id}`);
    }

    render() {
        const {classes} = this.props;

        return (
            <Paper className={classes.root}>
                <Grid
                    onRowClick={this.onRowClick}
                    search={true}
                    remoteDataBound={true}
                    searchByLabel={'name/machine'}
                    apiRoute={ApiPath.api.testRuns}
                    columnSchema={columnSchema}
                    defaultSort={{
                        order: 'asc',
                        orderBy: 'createDate'
                    }}
                />
            </Paper>
        );
    }
}

const styles = (theme: Theme) => ({
    root: {
        width: '100%'
    }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<{}>(GridControl);