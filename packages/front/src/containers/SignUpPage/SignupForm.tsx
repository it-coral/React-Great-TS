import * as React from 'react';
import Grid from 'material-ui/Grid';
import { Field, Form } from 'react-final-form';
import TextFieldControl from '../../components/common/form-elements/TextFieldControl';
import Button from 'material-ui/Button';
import { WithStyles } from 'material-ui';
import withStyles from 'material-ui/styles/withStyles';
import { Link } from 'react-router-dom';
import Typography from 'material-ui/Typography';
import { RouteComponentProps, withRouter } from 'react-router';
import FormValidators from '../../helpers/form-validators';
import AxiosFactory from '../../services/AxiosFactory';
import ApiPath from '../../constants/ApiPath';
import CheckboxControl from '../../components/common/form-elements/CheckboxControl';
import { CircularProgress } from 'material-ui/Progress';
import { Login as LoginRoutes } from '../../constants/RoutesNames';

interface ISignupForm {
    email: string;
    password: string;
    phone: string;
    company: string;
    acceptTerms: boolean;
    termsDate?: Date;
}

interface IValidateEmail {
    data: object[];
}

class SignupForm extends React.Component<RouteComponentProps<{}> & WithStyles<'signInButton' |
    'buttonContainer' |
    'formContainer' |
    'forgotPasswordContainer' |
    'link' |
    'linkText'>> {

    axiosFactory: AxiosFactory;

    constructor(props: RouteComponentProps<{}> & WithStyles<
        'signInButton' |
        'buttonContainer' |
        'formContainer' |
        'forgotPasswordContainer' |
        'link' |
        'linkText'>) {
        super(props);

        this.axiosFactory = new AxiosFactory();

        this.onSubmit = this.onSubmit.bind(this);
    }

    usernameAvailable = async (value: string) => {
        return await this.axiosFactory.axios.get(`${ApiPath.api.emailUnique}/${value}`)
            .then((res: IValidateEmail) => {
                if (res.data.length > 0) {
                    return 'User name is already used.';
                } else {
                    return undefined;
                }
            });
    }

    public render(): JSX.Element {
        const { classes } = this.props;
        return (
            <Form
                onSubmit={this.onSubmit}
                render={({ handleSubmit, submitting }) => (
                    <form
                        className={classes.formContainer}
                        onSubmit={handleSubmit}
                    >
                        <Grid container={true}>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="text"
                                    name="email"
                                    label="Email Address"
                                    validate={FormValidators.composeValidators(
                                        FormValidators.required(),
                                        FormValidators.isEmail,
                                        this.usernameAvailable
                                    )}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="password"
                                    name="password"
                                    label="Password"
                                    validate={FormValidators.composeValidators(
                                        FormValidators.required(),
                                        FormValidators.minValue(6, 'Password must be at least 6 characters.')
                                    )}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="text"
                                    name="phone"
                                    label="Phone Number"
                                    validate={FormValidators.composeValidators(
                                        FormValidators.required(),
                                        FormValidators.minValue(7, 'Phone must be at least 7 characters.')
                                    )}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="text"
                                    name="company"
                                    label="Company"
                                    validate={FormValidators.required()}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Field
                                    name="acceptTerms"
                                    component={CheckboxControl}
                                    type="checkbox"
                                    label={<span>I agree to the <a target="_blank" href="app-terms/">
                                            Terms of Service</a></span>}
                                    validate={FormValidators.required(`To open an account on testRTC you
                                                                       must agree to our terms of service.`)}
                                />
                            </Grid>
                            <Grid
                                className={classes.buttonContainer}
                                item={true}
                                xs={12}
                            >
                                <Button
                                    type="submit"
                                    variant="raised"
                                    color="primary"
                                    className={classes.signInButton}
                                    disabled={submitting}
                                >
                                    {!submitting ?
                                        <React.Fragment>Sign Up</React.Fragment> :
                                        <CircularProgress size={14}/>
                                    }
                                </Button>
                            </Grid>
                            <Grid item={true} xs={6}>
                                <Link className={classes.link} to="/signin">
                                    <Typography color="textSecondary" className={classes.linkText}>
                                        Already have an account?
                                    </Typography>
                                </Link>
                            </Grid>
                            <Grid item={true} xs={6}>
                                <Link className={classes.link} to="/forgot">
                                    <Typography color="textSecondary" align="right" className={classes.linkText}>
                                        Subscribe
                                    </Typography>
                                </Link>
                            </Grid>
                        </Grid>
                    </form>
                )}
            />
        );
    }

    private onSubmit(values: ISignupForm): Promise<void | { [x: string]: string; }> {
        let signUpValues = values;
        signUpValues.termsDate = new Date();

        return this.axiosFactory.axios.post(ApiPath.api.signup, signUpValues)
            .then(() => {
                this.props.history.push(`${LoginRoutes.SignUpConfirm}/${signUpValues.email}`);
            });
    }
}

const decorate = withStyles(theme => ({
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
        paddingTop: 0
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

export default withRouter<any>(decorate<{}>(SignupForm)); // tslint:disable-line