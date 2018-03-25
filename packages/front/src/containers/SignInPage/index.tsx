import * as React from 'react';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { WithStyles } from 'material-ui/styles';
import withStyles from 'material-ui/styles/withStyles';
import SigninForm from './SigninForm';
import { Link } from 'react-router-dom';
import Button from 'material-ui/Button';
import Typography from 'material-ui/Typography';

interface ILoginPageProps {
    test: string;
}

class SignInPage extends React.Component<ILoginPageProps &
    WithStyles<'root' |
        'socialButton' |
        'googleButton' |
        'facebookButton' |
        'linkedInButton' |
        'title' |
        'orWrapper'|
        'orText'>> {
    public render(): JSX.Element {
        const {classes} = this.props;
        return (
            <div style={{flexGrow: 1}}>
                <Grid container={true} spacing={8}>
                    <Grid item={true} xs={12}>
                        <Grid
                            container={true}
                            alignItems="center"
                            direction="row"
                            justify="center"
                        >
                            <Grid item={true} xs={12} md={3}>
                                <Typography
                                    className={classes.title}
                                    align="center"
                                    color="primary"
                                    variant="title"
                                >
                                    Login to testRTC
                                </Typography>
                                <Grid container={true}>
                                    <Grid item={true} xs={12}>
                                        <Button
                                            variant="raised"
                                            className={`${classes.socialButton} ${classes.googleButton}`}
                                        >
                                            Sign in with Google
                                        </Button>
                                        <Button
                                            variant="raised"
                                            className={`${classes.socialButton} ${classes.facebookButton}`}
                                        >
                                            Sign in with Facebook
                                        </Button>
                                        <Button
                                            variant="raised"
                                            className={`${classes.socialButton} ${classes.linkedInButton}`}
                                        >
                                            Sign in with LinkedIn
                                        </Button>
                                    </Grid>
                                    <Grid item={true} xs={12}>
                                        <div className={classes.orWrapper}>
                                            <span className={classes.orText}>
                                                Or
                                            </span>
                                        </div>
                                    </Grid>
                                    <Grid item={true} xs={12}>
                                        <Paper className={classes.root} elevation={4}>
                                            <SigninForm/>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid item={true} xs={12} md={3}>
                                <Grid container={true} alignItems="center" justify="center">
                                    <Link to={'/analyze'}>
                                        <img src="assets/images/analyze-banner.png"/>
                                    </Link>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </div>
        );
    }
}

const decorate = withStyles((theme) => ({
    root: {
        padding: theme.spacing.unit * 3,
    },
    socialButton: {
        marginBottom: theme.spacing.unit,
        color: '#fff',
        width: '100%'
    },
    googleButton: {
        background: '#CF3D2E',
    },
    facebookButton: {
        background: '#3C599F',
    },
    linkedInButton: {
        background: '#0085AE',
    },
    title: {
        marginTop: theme.spacing.unit * 2,
        marginBottom: theme.spacing.unit * 2,
    },
    orWrapper: {
        width: '100%',
        textAlign: 'center',
        borderBottom: '1px solid #000',
        lineHeight: '0.1em',
        margin: '10px 0 20px',
    },
    orText: {
        background: '#fafafa',
        padding: '0 10px',
    }
}));

export default decorate<{}>(SignInPage);