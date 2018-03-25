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
import { connect, Dispatch } from 'react-redux';
import { AuthorizeAction, IAuthorizeAction } from '../../actions/authAction';

const required = (value: string) => (value ? undefined : 'This field is required');
const isEmail = (value: string) => {
    let regex = /^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/;
    return regex.test(String(value)) ? undefined : 'This is not an valid email';
};

const composeValidators = (...validators: ((value: string) => void)[]) => (value: string) =>
    validators.reduce((error, validator) => error || validator(value), undefined);

interface ISigninFormDispatch {
    authorize(): void;
}

class SigninForm extends React.Component<RouteComponentProps<{}> & ISigninFormDispatch & WithStyles<'signInButton'>> {
    constructor(props: RouteComponentProps<{}> & ISigninFormDispatch & WithStyles<'signInButton'>) {
        super(props);

        this.onSubmit = this.onSubmit.bind(this);
    }

    public render(): JSX.Element {
        const {classes} = this.props;
        return (
            <Form
                onSubmit={this.onSubmit}
                render={({handleSubmit}) => (
                    <form onSubmit={handleSubmit}>
                        <Grid container={true}>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="text"
                                    name="email"
                                    placeholder="Email Address"
                                    label="Email Address"
                                    validate={composeValidators(required, isEmail)}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    label="Password"
                                    validate={required}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Button type="submit" variant="raised" color="primary" className={classes.signInButton}>
                                    Sign in
                                </Button>
                            </Grid>
                            <Grid item={true} xs={6}>
                                <Link to="/signup">
                                    <Typography color="textSecondary">
                                        Create an account
                                    </Typography>
                                </Link>
                            </Grid>
                            <Grid item={true} xs={6}>
                                <div>
                                    <Link to="/forgot">
                                        <Typography color="textSecondary" align="right">
                                            Forgot password
                                        </Typography>
                                    </Link>
                                </div>
                                <div>
                                    <Link to="/forgot">
                                        <Typography color="textSecondary" align="right">
                                            Subscribe
                                        </Typography>
                                    </Link>
                                </div>
                            </Grid>
                        </Grid>
                    </form>
                )}
            />
        );
    }

    private onSubmit(values: any): void { //tslint:disable-line
        console.log("on submit", values); // tslint:disable-line
        this.props.authorize();
        this.props.history.push('/main');
    }
}

const decorate = withStyles((theme) => ({
    signInButton: {
        width: '100%'
    }
}));

const mapDispatchToProps = (dispatch: Dispatch<IAuthorizeAction>): ISigninFormDispatch => {
    return {
        authorize: () => dispatch(AuthorizeAction()),
    };
};

export default withRouter<any>(decorate<{}>(connect(null, mapDispatchToProps)(SigninForm))); // tslint:disable-line