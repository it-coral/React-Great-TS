import * as React from 'react';
import Grid from 'material-ui/Grid';
import { Field, Form } from 'react-final-form';
import Button from 'material-ui/Button';
import { WithStyles } from 'material-ui';
import withStyles from 'material-ui/styles/withStyles';
import { Link } from 'react-router-dom';
import Typography from 'material-ui/Typography';
import Email from 'material-ui-icons/Email';
import Lock from 'material-ui-icons/Lock';
import { RouteComponentProps, withRouter } from 'react-router';
import { connect, Dispatch } from 'react-redux';
import { AuthorizeAction, IAuthorizeAction } from '../../actions/authAction';
import TextFieldControl from '../../components/common/form-elements/TextFieldControl';
import FormValidators from '../../helpers/form-validators';

interface ISigninFormDispatch {
    authorize(): void;
}

class SigninForm extends React.Component<RouteComponentProps<{}>
    & ISigninFormDispatch & WithStyles<
    'signInButton' |
    'buttonContainer' |
    'formContainer' |
    'forgotPasswordContainer' |
    'link' |
    'linkText' |
    'fieldIconContainer' |
    'formSection'
    >> {
    constructor(props: RouteComponentProps<{}> & ISigninFormDispatch & WithStyles<'signInButton' |
        'buttonContainer' | 'formContainer' | 'forgotPasswordContainer' | 'link' | 'linkText' | 'fieldIconContainer'>) {
        super(props);

        this.onSubmit = this.onSubmit.bind(this);
    }

    public render(): JSX.Element {
        const { classes } = this.props;
        return (
            <Form
                onSubmit={this.onSubmit}
                render={({ handleSubmit }) => (
                    <form
                        className={classes.formContainer}
                        onSubmit={handleSubmit}
                    >
                        <Grid container={true}>
                            <Grid className={classes.fieldIconContainer} item={true} xs={1}>
                                <Email />
                            </Grid>
                            <Grid item={true} xs={11}>
                                <Field
                                    component={TextFieldControl}
                                    type="text"
                                    name="email"
                                    label="Email Address"
                                    validate={FormValidators.composeValidators(FormValidators.required,
                                                                               FormValidators.isEmail)}
                                />
                            </Grid>
                            <Grid className={classes.fieldIconContainer} item={true} xs={1}>
                                <Lock />
                            </Grid>
                            <Grid item={true} xs={11}>
                                <Field
                                    component={TextFieldControl}
                                    type="password"
                                    name="password"
                                    label="Password"
                                    validate={FormValidators.required}
                                />
                            </Grid>
                            <Grid
                                item={true}
                                xs={12}
                                className={classes.formSection}
                            >
                                <Grid container={true}>
                                    <Grid
                                        item={true}
                                        xs={6}
                                        className={classes.forgotPasswordContainer}
                                    >
                                        <Link className={classes.link} to="/forgot">
                                            <Typography align="right" className={classes.linkText}>
                                                Forgot password?
                                    </Typography>
                                        </Link>
                                    </Grid>
                                    <Grid
                                        item={true}
                                        xs={6}
                                        className={classes.buttonContainer}
                                    >
                                        <Button
                                            type="submit"
                                            variant="raised"
                                            color="primary"
                                            className={classes.signInButton}
                                        >
                                            Sign in
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid
                                item={true}
                                xs={12}
                                className={classes.formSection}
                            >
                                <Grid container={true} className={classes.formSection}>
                                    <Grid item={true} xs={6}>
                                        <Link className={classes.link} to="/signup">
                                            <Typography color="textSecondary" className={classes.linkText}>
                                                Create an account
                                        </Typography>
                                        </Link>
                                    </Grid>
                                    <Grid item={true} xs={6}>
                                        <div>
                                            <Link className={classes.link} to="/forgot">
                                                <Typography
                                                    color="textSecondary"
                                                    align="right"
                                                    className={classes.linkText}
                                                >
                                                    Subscribe
                                                </Typography>
                                            </Link>
                                        </div>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </form>
                )}
            />
        );
    }

    private onSubmit(values: any): void { //tslint:disable-line
        console.log('on submit', values); // tslint:disable-line
        this.props.authorize();
        this.props.history.push('/main');
    }
}

const decorate = withStyles(theme => ({
    formSection: {
        padding: `${theme.spacing.unit}px 0`
    },
    fieldIconContainer: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        opacity: 0.4
    },
    buttonContainer: {
        display: 'flex',
        justifyContent: 'flex-end'
    },
    forgotPasswordContainer: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    signInButton: {
        width: 'auto'
    },
    formContainer: {
        paddingTop: theme.spacing.unit * 10
    },
    link: {
        textDecoration: 'none',
        '&:hover': {
            textDecoration: 'underline'
        },
        '&:active': {
            textDecoration: 'none'
        }
    },
    linkText: {
        color: '#559542',
    }
} as React.CSSProperties));

const mapDispatchToProps = (dispatch: Dispatch<IAuthorizeAction>): ISigninFormDispatch => {
    return {
        authorize: () => dispatch(AuthorizeAction()),
    };
};

export default withRouter<any>(decorate<{}>(connect(null, mapDispatchToProps)(SigninForm))); // tslint:disable-line