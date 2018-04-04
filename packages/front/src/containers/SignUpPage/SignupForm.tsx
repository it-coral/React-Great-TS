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

type StyledComponent = WithStyles<
    'signInButton' |
    'buttonContainer' |
    'formContainer' |
    'forgotPasswordContainer' |
    'link' |
    'linkText'
>;

class SignupForm extends React.Component<RouteComponentProps<{}> & StyledComponent> {
    constructor(props: RouteComponentProps<{}> & StyledComponent) {
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
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="text"
                                    name="email"
                                    label="Email Address"
                                    validate={FormValidators.composeValidators(FormValidators.required,
                                                                               FormValidators.isEmail)}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="password"
                                    name="password"
                                    label="Password"
                                    validate={FormValidators.required}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="text"
                                    name="phoneNumber"
                                    label="Phone Number"
                                    validate={FormValidators.required}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="text"
                                    name="company"
                                    label="Company"
                                    validate={FormValidators.required}
                                />
                            </Grid>
                            <Grid
                                className={classes.buttonContainer}
                                item={true}
                                xs={12}
                            >
                                <Button type="submit" variant="raised" color="primary" className={classes.signInButton}>
                                    Sign up
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

    private onSubmit(values: any): void { //tslint:disable-line
        console.log('on submit', values); // tslint:disable-line
        this.props.history.push('/app/main');
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