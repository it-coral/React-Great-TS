import * as React from 'react';
import Grid from 'material-ui/Grid';
import Card from 'material-ui/Card';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import Divider from 'material-ui/Divider';
import withStyles from 'material-ui/styles/withStyles';
import { Theme, WithStyles } from 'material-ui';
import TestSessionsGridControl from './TestSessionsGridControl';

type StyledComponent = WithStyles<
  'card' |
  'divider' |
  'toolbar'
  >;

interface ITestSessions {
  testIterationId: string;
}

class TestSessions extends React.Component<StyledComponent & ITestSessions> {
  public render(): JSX.Element {
    const {
      classes
    } = this.props;

    return (
      <Grid container={true} spacing={16}>
        <Grid item={true} xs={12}>
          <Card className={classes.card}>
            <Toolbar className={classes.toolbar}>
              <Typography variant="subheading">
                Test Sessions / Groups
              </Typography>
            </Toolbar>
            <Divider className={classes.divider} />
            <Grid container={true} spacing={40}>
              <TestSessionsGridControl testIterationId={this.props.testIterationId}/>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    );
  }
}

const styles = (theme: Theme) => ({
  card: {
    marginTop: theme.spacing.unit * 3,
    padding: theme.spacing.unit * 2
  },
  divider: {
    margin: '16px -16px'
  },
  toolbar: {
    minHeight: 24,
    padding: 0
  }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<ITestSessions>(TestSessions);