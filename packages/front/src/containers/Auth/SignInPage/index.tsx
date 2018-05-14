import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { WithStyles } from 'material-ui/styles';
import withStyles from 'material-ui/styles/withStyles';
import Typography from 'material-ui/Typography';
import Slide from 'material-ui/transitions/Slide';
import SigninForm from './SigninForm';
import AnalyzerBanner from '../../../components/common/auth/AnalyzerBanner';
// import LoginSocialButtons from '../../../components/common/auth/LoginSocialButtons';
import FooterColors from '../../../components/common/auth/FooterColors';
import RemindPasswordModal from './RemindPasswordModal';
import { Login as LoginRoutes } from '../../../constants/RoutesNames';

type SignInPageStyles = WithStyles<'root' |
    'title' |
    'orWrapper' |
    'orText' |
    'signInContainer' |
    'titleContainer'>;

interface ISignInPageState {
    remindOpened: boolean;
    emailRemind: string;
}

class SignInPage extends React.Component<RouteComponentProps<{}> & SignInPageStyles, ISignInPageState> {
    constructor(props: RouteComponentProps<{}> & SignInPageStyles) {
        super(props);

        this.state = {
            remindOpened: false,
            emailRemind: '',
        };

        this.closeModal = this.closeModal.bind(this);
    }
    componentWillMount() {
        if (this.props.location.state !== undefined && this.props.location.state.isPasswordRemind) {
            this.setState({
                remindOpened: true,
                emailRemind: this.props.location.state.emailRemind,
            });
        }
        this.props.history.replace({pathname: LoginRoutes.SignIn, state: {}});
    }

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
                            <RemindPasswordModal
                                emailRemind={this.state.emailRemind}
                                isOpen={this.state.remindOpened}
                                onClose={() => this.closeModal()}
                            />
                            <div className={classes.titleContainer}>
                                <Typography
                                    className={classes.title}
                                    align="left"
                                    variant="title"
                                >
                                    Login to testRTC
                                </Typography>
                            </div>
                            <div className={classes.signInContainer}>
                                <Grid container={true}>
                                    <Grid item={true} xs={12}>
                                        <SigninForm />
                                    </Grid>                                
                                </Grid>                            
                            </div>
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

    private closeModal(): void {
        this.setState({
            remindOpened: false,
        });
    }
}

const decorate = withStyles((theme) => ({
    root: {
        padding: theme.spacing.unit * 5,
    },
    orText: {
        margin: `0 0 ${theme.spacing.unit * 2}px 0`,
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
    },
    signInContainer: {
        marginTop: '5em',
        textAlign: 'center'
    }
} as React.CSSProperties));

export default decorate<{}>(SignInPage);

// <Grid item={true} xs={12}>
//     <LoginSocialButtons />
// </Grid>
// 
// <Grid item={true} xs={12}>
//     <div className={classes.orText}>
//         <Typography>
//             Or
//         </Typography>
//     </div>
// </Grid>z