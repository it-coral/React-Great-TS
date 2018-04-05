import * as React from 'react';
import { Field, Form } from 'react-final-form';
import { withStyles, WithStyles } from 'material-ui/styles';
// import Typography from 'material-ui/Typography';
import Grid from 'material-ui/Grid';
import TextFieldControl from '../../components/common/form-elements/TextFieldControl';
import FormValidators from '../../helpers/form-validators';
import Paper from 'material-ui/Paper';

interface TestPropertyFormProps {
    // tslint:disable-next-line:no-any
    onSubmit(values: any): void;
}

type StyledComponent = WithStyles<
    'root' |
    'formRoot'
    >;

class TestPropertyForm extends React.Component<TestPropertyFormProps & StyledComponent> {
    render() {
        const { classes } = this.props;
        return (
            <Paper className={classes.root}>
                <Form
                    onSubmit={this.props.onSubmit}
                    render={({ handleSubmit, submitError }) => (
                        <form
                            className={classes.formRoot}
                            onSubmit={handleSubmit}
                        >
                            <div>
                                <Grid container={true}>
                                    <Grid item={true} xs={12} md={6}>
                                        <Grid container={true}>

                                            <Grid item={true} xs={12}>
                                                <Field
                                                    component={TextFieldControl}
                                                    type="text"
                                                    name="name"
                                                    label="Test Name"
                                                    validate={FormValidators.required}
                                                />
                                            </Grid>
                                            <Grid item={true} xs={12}>
                                                <Field
                                                    component={TextFieldControl}
                                                    type="text"
                                                    multiline={true}
                                                    rows="5"
                                                    name="info"
                                                    label="Description"
                                                />
                                            </Grid>
                                            <Grid item={true} xs={3}>
                                                <Field
                                                    component={TextFieldControl}
                                                    type="number"
                                                    name="parameters.concurrentUsers"
                                                    label="Concurrent probes"
                                                />
                                            </Grid>
                                            <Grid item={true} xs={3}>
                                                <Field
                                                    component={TextFieldControl}
                                                    type="number"
                                                    name="parameters.loopCount"
                                                    label="Iterations"
                                                />
                                            </Grid>
                                            <Grid item={true} xs={12}>
                                                <Field
                                                    component={TextFieldControl}
                                                    type="text"
                                                    name="runOptions"
                                                    label="Run Options"
                                                />
                                            </Grid>
                                            <Grid item={true} xs={12}>
                                                <Field
                                                    component={TextFieldControl}
                                                    type="text"
                                                    name="serviceUrl"
                                                    label="Service URL"
                                                    placeholder="https://...."
                                                />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </div>
                        </form>
                    )}
                />
            </Paper>
        );
    }
}

const decorate = withStyles(theme => ({
    root: {
        width: '100%',
        height: 'auto',
        padding: theme.spacing.unit * 3
    },
    formRoot: {

    }
} as React.CSSProperties));

export default decorate<TestPropertyFormProps>(TestPropertyForm);