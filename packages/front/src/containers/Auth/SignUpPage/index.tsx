import * as React from 'react';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { WithStyles } from 'material-ui/styles';
import withStyles from 'material-ui/styles/withStyles';
import Typography from 'material-ui/Typography';
import Slide from 'material-ui/transitions/Slide';
import AnalyzerBanner from '../../../components/common/auth/AnalyzerBanner';
import LoginSocialButtons from '../../../components/common/auth/LoginSocialButtons';
import FooterColors from '../../../components/common/auth/FooterColors';
import SignupForm from './SignupForm';

class SignUpPage extends React.Component<WithStyles<'root' |
    'title' |
    'orWrapper' |
    'orText' |
    'banner' |
    'bannerLink' |
    'socialsButtonsContainer' |
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
                                    Signup on testRTC
                                </Typography>
                            </div>
                            <div className={classes.socialsButtonsContainer}>
                                <LoginSocialButtons />
                            </div>
                            <div className={classes.orText}>
                                <Typography>
                                    Or sign up using email
                                </Typography>
                            </div>
                            <SignupForm />
                            <FooterColors/>
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
    banner: {
        height: 'auto'
    },
    bannerLink: {
        marginTop: 158
    },
    socialsButtonsContainer: {
        paddingTop: theme.spacing.unit * 7
    },
    title: {
        fontSize: '1.9rem',
        color: 'white',
        fontWeight: 300,
        margin: 0,
        marginTop: theme.spacing.unit,
        userSelect: 'none'
    },
    titleContainer: {
        height: 100,
        backgroundColor: '#4682C3',
        padding: theme.spacing.unit * 5,
        margin: -(theme.spacing.unit * 5),
        justifyContent: 'center'
    }
} as React.CSSProperties));

export default decorate<{}>(SignUpPage);