import * as React from 'react';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { WithStyles } from 'material-ui/styles';
import withStyles from 'material-ui/styles/withStyles';
import SigninForm from './SigninForm';
import { Link } from 'react-router-dom';
import Typography from 'material-ui/Typography';
import LoginSocialButtons from '../common/LoginSocialButtons';

class SignInPage extends React.Component<WithStyles<'root' |
    'title' |
    'orWrapper' |
    'orText'>> {
    public render(): JSX.Element {
        const {classes} = this.props;
        return (
            <div style={{flexGrow: 1}}>
                <Grid container={true} spacing={8}>
                    <Grid item={true} xs={12}>
                        <Grid
                            container={true}
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
                                    <LoginSocialButtons/>
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
                                <Grid style={{marginTop: '10vh'}} container={true} alignItems="center" justify="center">
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