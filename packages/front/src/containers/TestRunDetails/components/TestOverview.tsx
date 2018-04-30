import * as React from 'react';
import { connect } from 'react-redux';
import Card from 'material-ui/Card';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import { RouteComponentProps, withRouter } from 'react-router';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import { TestProperty, TestLogs } from '../../../constants/RoutesNames';
import { Statuses } from '../../../constants/TestStatus';
import Tooltip from 'material-ui/Tooltip';
import { formatDuration } from '../../../helpers/testDetails';
import Icon from 'material-ui/Icon';
import Toolbar from 'material-ui/Toolbar';
import Divider from 'material-ui/Divider';

import Build from '@material-ui/icons/Build';
import Done from '@material-ui/icons/Done';
import ExitToApp from '@material-ui/icons/ExitToApp';
import Replay from '@material-ui/icons/Replay';
import PlayArrow from '@material-ui/icons/PlayArrow';
import RemoveCircle from '@material-ui/icons/RemoveCircle';
import Warning from '@material-ui/icons/Warning';
import Cancel from '@material-ui/icons/Cancel';
import Error from '@material-ui/icons/Error';
import Timer from '@material-ui/icons/Timer';

import * as moment from 'moment';

export interface TestOverviewStoreProps {
  user: User;
}

export interface TestOverviewProps {
  // tslint:disable-next-line:no-any
  data: any;
  // tslint:disable-next-line:no-any
  calc: any;
  successRate?: string;
  audioMosPanelColor?: string;
}

interface OverviewLineProps {
  title: string;
  tooltipTitle?: string;
  icon?: string;
  color?: string;
  value: React.ReactElement<React.ReactNode> | string | number;
}

interface StatusIconSwitchProps {
  status: string;
}

type StyledComponent = WithStyles<
  'card' |
  'overviewLine' |
  'link' |
  'tooltip' |
  'lineValue' |
  'lineIcon' |
  'lineTitle' |
  'divider' |
  'statusValue' |
  'toolbar'
  >;

class TestOverview extends React.Component<TestOverviewStoreProps &
  TestOverviewProps & RouteComponentProps<{}> & StyledComponent> {
  constructor(props: TestOverviewStoreProps & TestOverviewProps & RouteComponentProps<{}> & StyledComponent) {
    super(props);
  }

  OverviewLine = (props: OverviewLineProps): JSX.Element => {
    return (
      <Tooltip
        classes={{
          tooltip: this.props.classes.tooltip
        }}
        placement="top"
        title={props.tooltipTitle || ''}
        disableHoverListener={!props.tooltipTitle}
        disableTouchListener={!props.tooltipTitle}
        disableFocusListener={!props.tooltipTitle}
      >
        <div
          style={{
            cursor: props.tooltipTitle ? 'help' : 'default'
          }}
          className={this.props.classes.overviewLine}
        >
          <Typography
            className={this.props.classes.lineTitle}
          >
            {props.icon && <Icon className={this.props.classes.lineIcon}>{props.icon}</Icon>}
            {props.title}
          </Typography>
          <Typography
            className={this.props.classes.lineValue}
            style={{ color: props.color ? props.color : 'inherit' }}
          >
            {props.value}
          </Typography>
        </div>
      </Tooltip>
    );
  }

  StatusIconSwitch = (props: StatusIconSwitchProps): JSX.Element => {
    switch (props.status) {
      case Statuses.warnings:
        return <Warning style={{ color: '#F1CD2B', marginRight: 5 }} />;
      case Statuses.error:
        return <RemoveCircle style={{ color: '#a22a21', marginRight: 5 }} />;
      case Statuses.failure:
        return <Error style={{ color: '#A22A21', marginRight: 5 }} />;
      case Statuses.timeout:
        return <Timer style={{ color: '#c4c4c4', marginRight: 5 }} />;
      case Statuses.completed:
        return <Done style={{ color: '#559542', marginRight: 5 }} />;
      case Statuses.serviceFailure:
        return <Build style={{ color: '#c4c4c4', marginRight: 5 }} />;
      case Statuses.terminated:
        return <Cancel style={{ color: '#676A6C', marginRight: 5 }} />;
      case Statuses.started:
        return <PlayArrow style={{ color: '#c4c4c4', marginRight: 5 }} />;
      case Statuses.retry:
        return <Replay style={{ color: '#c4c4c4', marginRight: 5 }} />;
      case Statuses.dismissed:
        return <ExitToApp style={{ color: '#c4c4c4', marginRight: 5 }} />;
      default:
        return <span />;
    }
  }

  render() {
    const {
      data,
      calc,
      user,
      audioMosPanelColor,
      history,
      classes,
      successRate
    } = this.props;

    return (
      <Grid container={true} spacing={16}>
        <Grid item={true} xs={12}>
          <Card className={classes.card}>
            <Toolbar className={classes.toolbar}>
              <Typography variant="subheading">
                Test Result Overview
              </Typography>
            </Toolbar>
            <Divider className={classes.divider} />
            <Grid container={true} spacing={40}>
              <Grid item={true} sm={6} xs={12}>
                <this.OverviewLine
                  title="Test name"
                  tooltipTitle="Click the name of the test to see its details"
                  value={
                    <a
                      className={classes.link}
                      onClick={() => history.push(`${TestProperty}/${data.testId}`)}
                    >
                      {data.name}
                    </a>
                  }
                />
                <this.OverviewLine
                  title="Concurrent probes"
                  icon="group"
                  tooltipTitle="Number of browsers used simultaneously"
                  value={data.parameters && data.parameters.concurrentUsers}
                />
                {successRate && <this.OverviewLine
                  title="Success rate"
                  icon="done"
                  tooltipTitle="Success rate of probes"
                  value={successRate}
                />}
                {data.manual > 0 && <this.OverviewLine
                  title="Manually attached browsers"
                  tooltipTitle="Number of manually attached browsers"
                  value={data.manual}
                />}
                <this.OverviewLine
                  title="Total incoming data (Kbit)"
                  icon="call_received"
                  tooltipTitle="Total amount of Kbits received by all browsers"
                  value={(data.stat.recv.totalBytes * 8 / 1000).toLocaleString('en', { maximumFractionDigits: 0 })}
                />
                <this.OverviewLine
                  title="Total outgoing data (Kbit)"
                  icon="call_made"
                  tooltipTitle="Total amout of Kbits sent by all browsers"
                  value={(data.stat.send.totalBytes * 8 / 1000).toLocaleString('en', { maximumFractionDigits: 0 })}
                />
              </Grid>
              <Grid item={true} sm={6} xs={12}>
                <this.OverviewLine
                  title="Status"
                  tooltipTitle="Test completion status"
                  value={
                    <span className={this.props.classes.statusValue} >
                      <this.StatusIconSwitch status={data.status} />
                      {data.logUrls ?
                        <a
                          className={classes.link}
                          onClick={() => history.push(`${TestLogs}/${data.testId}`)}
                        >
                          {data.status}
                        </a> :
                        data.status}
                    </span>}
                />
                <this.OverviewLine
                  title="Test start time"
                  icon="play_arrow"
                  tooltipTitle="Time the test started"
                  value={moment(data.createdDate).format('MM/DD/YYYY @ h:MM:SSA')}
                />
                <this.OverviewLine
                  title="Test end time"
                  icon="stop"
                  tooltipTitle="Time the test finished"
                  value={moment(data.endDate).format('MM/DD/YYYY @ h:MM:SSA')}
                />
                <this.OverviewLine
                  title="Test duration"
                  icon="access_time"
                  tooltipTitle="Total time of test execution"
                  value={formatDuration(calc.testDuration, 'DHMS')}
                />
                <this.OverviewLine
                  title="Average call setup time"
                  icon="av_timer"
                  tooltipTitle="The average time it took to connect the sessions"
                  value={formatDuration(data.stat.voiceSetupTime * 1000, 'DHMSms')}
                />
                <this.OverviewLine
                  title="User"
                  icon="person"
                  value={data.userName}
                />
                {data.audioMOS && <this.OverviewLine
                  title="Audio MOS"
                  color={audioMosPanelColor}
                  value={data.audioMOS}
                />}
                {data.systemInUse && user.role === 'admin' && <this.OverviewLine
                  title="System"
                  icon="storage"
                  color={audioMosPanelColor}
                  value={data.systemInUse}
                />}
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    );
  }
}

const styles = (theme: Theme) => ({
  overviewLine: {
    height: 'auto',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  card: {
    marginTop: theme.spacing.unit * 3,
    padding: theme.spacing.unit * 2
  },
  link: {
    color: theme.palette.primary.main,
    cursor: 'pointer'
  },
  tooltip: {
    margin: '2px 0'
  },
  lineValue: {
    fontWeight: 500
  },
  lineTitle: {
    display: 'flex',
    alignItems: 'center'
  },
  lineIcon: {
    marginRight: 5,
    fontSize: 20,
    color: '#9a9a9a'
  },
  divider: {
    margin: '16px -16px'
  },
  statusValue: {
    display: 'flex',
    alignItems: 'center'
  },
  toolbar: {
    minHeight: 24,
    padding: 0
  }
} as React.CSSProperties);

const decorate = withStyles(styles);

const mapStateToProps = (state: IStore) => ({
  user: state.userAuth.user
});

export default withRouter<RouteComponentProps<{}> & TestOverviewProps>(
  connect<TestOverviewStoreProps, {}, RouteComponentProps<{}> & TestOverviewProps>(mapStateToProps)(
    decorate<TestOverviewProps & TestOverviewStoreProps & RouteComponentProps<{}>>(TestOverview)));