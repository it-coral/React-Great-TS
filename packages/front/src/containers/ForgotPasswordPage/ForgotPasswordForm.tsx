import * as React from 'react';
import { Field, Form } from 'react-final-form';
import TextFieldControl from '../../components/common/form-elements/TextFieldControl';
import FormValidators from '../../helpers/form-validators';
import { RouteComponentProps, withRouter } from 'react-router';
import { Login as LoginRoutes } from '../../constants/RoutesNames';
import AxiosFactory from '../../services/AxiosFactory';
import ApiPath from '../../constants/ApiPath';
import Grid from 'material-ui/Grid';
import Button from 'material-ui/Button';

interface IForgotForm {
    email: string;
}

interface IForgotFormError {
    message: string;
}

class ForgotPasswordForm extends React.Component<RouteComponentProps<{}>> {
    axiosFactory: AxiosFactory;

    constructor(props: RouteComponentProps<{}>) {
        super(props);

        this.axiosFactory = new AxiosFactory();
        this.onSubmit = this.onSubmit.bind(this);
    }

    public render(): JSX.Element {
        return (
            <Form
                onSubmit={this.onSubmit}
                render={({handleSubmit, submitError}) => (
                    <form
                        onSubmit={handleSubmit}
                    >
                        <Grid container={true}>
                            <Grid item={true} xs={12}>
                                <Field
                                    component={TextFieldControl}
                                    type="text"
                                    name="email"
                                    label="Email"
                                    validate={FormValidators.composeValidators(FormValidators.required(),
                                                                               FormValidators.isEmail)}
                                />
                            </Grid>
                            <Grid item={true} xs={12}>
                                <Button
                                    type="submit"
                                    variant="raised"
                                    color="secondary"
                                >
                                    Submit
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                )}
            />
        );
    }

    private onSubmit(values: IForgotForm): Promise<void | { [x: string]: string; }> {
        return this.axiosFactory.axios.get(`${ApiPath.api.requestPassword}/${values.email}`)
            .then(() => {
                this.props.history.push({
                    pathname: LoginRoutes.SignIn,
                    state: {isPasswordRemind: true, emailRemind: values.email}
                });
            })
            .catch((err: IForgotFormError) => {
                return {password: err.message};
            });
    }
}

export default withRouter<RouteComponentProps<{}>>(ForgotPasswordForm);