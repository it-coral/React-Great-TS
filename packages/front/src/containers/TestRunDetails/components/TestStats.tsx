import * as React from 'react';
import Card from 'material-ui/Card';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import AvTimer from '@material-ui/icons/AvTimer';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';

type StyledComponent = WithStyles<
  'icon'
>;

class TestStats extends React.Component<{} & StyledComponent> {
  constructor(props: StyledComponent) {
    super(props);
  }

  render() {
    const { classes } = this.props;

    return (
      <Grid container={true} spacing={16}>
        <Grid item={true} xs={12} sm={4}>
          <Card>
            <Grid container={true} spacing={16}>
              <Grid item={true} xs={12} sm={4}>
                <AvTimer className={classes.icon} />
              </Grid>
              <Grid item={true} xs={12} sm={4}>
                <Typography>
                  Some text
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    );
  }
}

const styles = (theme: Theme) => ({
  icon: {

  }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<{}>(TestStats);