import * as React from 'react';
import Grid from 'material-ui/Grid';
import { WithStyles } from 'material-ui/styles';
import withStyles from 'material-ui/styles/withStyles';
import { Link } from 'react-router-dom';

class AnalyzerBanner extends React.Component<WithStyles<
    'banner' |
    'bannerLink'>> {
    public render(): JSX.Element {
        const { classes } = this.props;
        return (
            <Grid
                className={classes.banner}
                container={true}
                alignItems="center"
                justify="center"
            >
                <Link className={classes.bannerLink} to={'/analyze'}>
                    <img src="assets/images/analyze-banner.png" />
                </Link>
            </Grid>
        );
    }
}

const decorate = withStyles((theme) => ({
    banner: {
        height: 'auto'
    },
    bannerLink: {
        marginTop: 158
    },
} as React.CSSProperties));

export default decorate<{}>(AnalyzerBanner);