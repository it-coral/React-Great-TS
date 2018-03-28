import * as React from 'react';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { WithStyles } from 'material-ui/styles';
import withStyles from 'material-ui/styles/withStyles';
import SigninForm from './SigninForm';
import AnalyzerBanner from '../common/AnalyzerBanner';
import Typography from 'material-ui/Typography';
import Slide from 'material-ui/transitions/Slide';
import LoginSocialButtons from '../common/LoginSocialButtons';

class SignInPage extends React.Component<WithStyles<'root' |
    'title' |
    'orWrapper' |
    'orText' |
    'titleContainer'>> {
    public render(): JSX.Element {
        const { classes } = this.props;
        return (
            <Grid
                container={true}
                direction="row"
                justify="center"
            >
                <Grid
                    item={true}
                    xs={12}
                    sm={6}
                    md={5}
                    lg={4}
                >
                    <Slide
                        direction="right"
                        in={true}
                        mountOnEnter={true}
                        unmountOnExit={true}
                    >
                        <Paper className={classes.root} elevation={4}>
                            <div className={classes.titleContainer}>
                                <Typography
                                    className={classes.title}
                                    align="left"
                                    variant="title"
                                >
                                    Login to testRTC
                                </Typography>
                            </div>
                            <Grid container={true}>
                                <Grid item={true} xs={12}>
                                    <SigninForm />
                                </Grid>
                                <Grid item={true} xs={12}>
                                    <div className={classes.orText}>
                                        <Typography>
                                            Or
                                </Typography>
                                    </div>
                                </Grid>
                            </Grid>
                            <Grid item={true} xs={12}>
                                <LoginSocialButtons />
                            </Grid>
                        </Paper>
                    </Slide>
                </Grid>
                <Grid
                    item={true}
                    xs={12}
                    sm={5}
                    lg={4}
                >
                    <AnalyzerBanner />
                </Grid>
            </Grid>
        );
    }
}

const decorate = withStyles((theme) => ({
    root: {
        padding: theme.spacing.unit * 5,
    },
    orText: {
        margin: `${theme.spacing.unit * 2}px 0`,
        padding: '0 10px',
        textAlign: 'center',
        textTransform: 'uppercase'
    },
    title: {
        fontSize: '1.9rem',
        color: 'white',
        fontWeight: 300,
        margin: 0,
        marginTop: theme.spacing.unit * 7,
        userSelect: 'none'
    },
    titleContainer: {
        height: 150,
        backgroundColor: '#4682C3',
        padding: theme.spacing.unit * 5,
        margin: -(theme.spacing.unit * 5),
        justifyContent: 'center'
    }
} as React.CSSProperties));

export default decorate<{}>(SignInPage);