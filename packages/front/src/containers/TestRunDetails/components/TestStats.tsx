import * as React from 'react';
import Card from 'material-ui/Card';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import AvTimer from '@material-ui/icons/AvTimer';
import SwapHoriz from '@material-ui/icons/SwapHoriz';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import { formatDuration } from '../../../helpers/testDetails';

export interface TestStatsProps {
  // tslint:disable-next-line:no-any
  data: any;
  // tslint:disable-next-line:no-any
  calc: any;
}

type StyledComponent = WithStyles<
  'icon' |
  'iconContainer' |
  'durationContainer' |
  'cardBlueBorder' |
  'cardGreenBorder' |
  'cardOrangeBorder'
  >;

class TestStats extends React.Component<TestStatsProps & StyledComponent> {
  constructor(props: TestStatsProps & StyledComponent) {
    super(props);
  }

  render() {
    const { data, calc, classes } = this.props;

    return (
      <Grid container={true} spacing={16}>
        <Grid item={true} xs={12} sm={4}>
          <Card className={classes.cardBlueBorder}>
            <Grid container={true} spacing={16}>
              <Grid item={true} xs={12}>
                <div className={classes.iconContainer}>
                  <AvTimer className={classes.icon} />
                </div>
                <div className={classes.durationContainer}>
                  <Typography>
                    {formatDuration(data.stat.voiceSetupTime * 1000, 'DHMSms')}
                  </Typography>
                </div>
              </Grid>
              <Grid item={true} xs={12}>
                <Typography>
                  Average call setup time (sec)
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Grid>
        <Grid item={true} xs={12} sm={4}>
          <Card className={classes.cardGreenBorder}>
            <Grid container={true} spacing={16}>
              <Grid item={true} xs={12}>
                <div className={classes.iconContainer}>
                  <SwapHoriz className={classes.icon} />
                </div>
                <div className={classes.durationContainer}>
                  <Typography>
                    {`In: ${calc.recv && calc.recv.packerErrorPCT.toFixed(3)}%`}
                  </Typography>
                  <Typography>
                    {`Out: ${calc.send && calc.send.packerErrorPCT.toFixed(3)}%`}
                  </Typography>
                </div>
              </Grid>
              <Grid item={true} xs={12}>
                <Typography>
                  Packet loss
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Grid>
        <Grid item={true} xs={12} sm={4}>
          <Card className={classes.cardOrangeBorder}>
            <Grid container={true} spacing={16}>
              <Grid item={true} xs={12}>
                <div className={classes.iconContainer}>
                  <SwapHoriz className={classes.icon} />
                </div>
                <div className={classes.durationContainer}>
                  <Typography>
                    {`In: ${data.stat.recv.bytes.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                  </Typography>
                  <Typography>
                    {`Out: ${data.stat.send.bytes.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                  </Typography>
                </div>
              </Grid>
              <Grid item={true} xs={12}>
                <Typography>
                  Effective Bit-rate (Kbits)
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    );
  }
}

const cardStyles = {
  borderWidth: 7,
  padding: 8,
  borderStyle: 'solid',
  borderRightColor: 'transparent',
  borderLeftColor: 'transparent',
  borderTopColor: 'transparent',
  borderBottomColor: 'transparent'
};

const styles = (theme: Theme) => ({
  iconContainer: {
    verticalAlign: 'top',
    width: 42,
    height: 42,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start'
  },
  icon: {
    fontSize: 30
  },
  durationContainer: {
    verticalAlign: 'top',
    height: 42,
    width: 'calc(100% - 42px)',
    display: 'inline-flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  cardBlueBorder: {
    ...cardStyles,
    borderLeftColor: theme.palette.primary.main
  },
  cardGreenBorder: {
    ...cardStyles,
    borderLeftColor: theme.palette.secondary.main
  },
  cardOrangeBorder: {
    ...cardStyles,
    borderLeftColor: '#DC7833'
  },
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<TestStatsProps>(TestStats);