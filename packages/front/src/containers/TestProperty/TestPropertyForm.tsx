import * as React from 'react';
import { Field, Form } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { FieldArray } from 'react-final-form-arrays';
import { withStyles, WithStyles } from 'material-ui/styles';
import Grid from 'material-ui/Grid';
import TextFieldControl from '../../components/common/form-elements/TextFieldControl';
import FormValidators from '../../helpers/form-validators';
import Paper from 'material-ui/Paper';
import MenuItem from 'material-ui/Menu/MenuItem';
import Button from 'material-ui/Button';
import { ITestPropertyForm } from './index';
import Divider from 'material-ui/Divider';
import IconButton from 'material-ui/IconButton';
import RemoveCircleOutline from 'material-ui-icons/RemoveCircleOutline';

interface TestPropertyFormProps {
  // TODO: remove any
  // tslint:disable-next-line:no-any
  userConfig: any;
  // TODO: remove any
  // tslint:disable-next-line:no-any
  initialValue?: any;
  onSubmit(values: ITestPropertyForm): void;
}

type StyledComponent = WithStyles<
  'root' |
  'formRoot' |
  'addProfileBtnContainer' |
  'addProfileBtn' |
  'removeBtnContainer' |
  'removeBtn' |
  'greenBtn' |
  'saveBtnContainer'
  >;

class TestPropertyForm extends React.Component<TestPropertyFormProps & StyledComponent> {
  render() {
    const {
      classes,
      userConfig
    } = this.props;
    return (
      <Paper className={classes.root}>
        <Form
          onSubmit={this.props.onSubmit}
          initialValues={{
            testProfiles: [{
              browser: 'linux-chrome-stable',
              location: 'any',
              network: 'No throttling',
              firewall: 'FW_NO_FW',
              media: 'KrankyGeek-2-1080p'
            }]
          }}
          mutators={{
            ...arrayMutators
          }}
          render={({ handleSubmit, submitError }) => (
            <form
              className={classes.formRoot}
              onSubmit={handleSubmit}
            >
              <Grid container={true}>
                <Grid item={true} xs={9}>
                  <Field
                    component={TextFieldControl}
                    type="text"
                    name="name"
                    label="Test Name"
                    validate={FormValidators.required}
                  />
                </Grid>
                <Grid item={true} xs={9}>
                  <Field
                    component={TextFieldControl}
                    type="text"
                    multiline={true}
                    rows="5"
                    name="info"
                    label="Description"
                  />
                </Grid>
                <Grid item={true} xs={9}>
                  <Grid container={true}>
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
                  </Grid>
                </Grid>
                <Grid item={true} xs={9}>
                  <Field
                    component={TextFieldControl}
                    type="text"
                    name="runOptions"
                    label="Run Options"
                  />
                </Grid>
                <Grid item={true} xs={9}>
                  <Field
                    component={TextFieldControl}
                    type="text"
                    name="serviceUrl"
                    label="Service URL"
                    placeholder="https://...."
                  />
                </Grid>
                <Grid item={true} xs={12}>

                  <Button
                    variant="raised"
                    className={classes.greenBtn}
                    onClick={() => alert('not yet ready')}
                  >
                    Upload
                  </Button>
                  <Button
                    variant="raised"
                    className={classes.greenBtn}
                    onClick={() => alert('not yet ready')}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="raised"
                    className={classes.addProfileBtn}
                    onClick={() => alert('not yet ready')}
                  >
                    Request Help
                  </Button>
                </Grid>
                <FieldArray name="testProfiles">
                  {({ fields }) =>
                    fields.map((name, index) => (
                      <React.Fragment key={index}>
                        <Grid item={true} xs={12}>
                          <Divider />
                        </Grid>
                        <Grid item={true} xs={7}>
                          <Field
                            component={TextFieldControl}
                            select={true}
                            SelectProps={{
                              autoWidth: true
                            }}
                            name={`${name}.browser`}
                            label="Browser"
                          >
                            {userConfig.data['docker-machines'].map(
                              // tslint:disable-next-line:no-any
                              (option: any, i: number) => (
                                <MenuItem
                                  key={i}
                                  value={option.id}
                                >
                                  {option.name}
                                </MenuItem>
                              ))}
                          </Field>
                        </Grid>
                        <Grid
                          className={classes.removeBtnContainer}
                          item={true}
                          xs={2}
                        >
                          {index > 0 && <IconButton
                            onClick={() => fields.pop()}
                            color="primary"
                            className={classes.removeBtn}
                          >
                            <RemoveCircleOutline />
                          </IconButton>}
                        </Grid>
                        <Grid item={true} xs={7}>
                          <Field
                            component={TextFieldControl}
                            select={true}
                            SelectProps={{
                              autoWidth: true
                            }}
                            name={`${name}.location`}
                            label="Location"
                          >
                            {userConfig.data['agent-locations'].map(
                              // tslint:disable-next-line:no-any
                              (option: any, i: number) => (
                                <MenuItem
                                  key={i}
                                  value={option.id}
                                >
                                  {option.name}
                                </MenuItem>
                              ))}
                          </Field>
                        </Grid>
                        <Grid item={true} xs={7}>
                          <Field
                            component={TextFieldControl}
                            select={true}
                            SelectProps={{
                              autoWidth: true
                            }}
                            name={`${name}.network`}
                            label="Network Profile"
                          >
                            {userConfig.data['network-profiles'].map(
                              // tslint:disable-next-line:no-any
                              (option: any, i: number) => (
                                <MenuItem
                                  key={i}
                                  value={option.id}
                                >
                                  {option.name}
                                </MenuItem>
                              ))}
                          </Field>
                        </Grid>
                        <Grid item={true} xs={7}>
                          <Field
                            component={TextFieldControl}
                            select={true}
                            SelectProps={{
                              autoWidth: true
                            }}
                            name={`${name}.firewall`}
                            label="Firewall Profile"
                          >
                            {userConfig.data['firewall-profiles'].map(
                              // TODO: remove any
                              // tslint:disable-next-line:no-any
                              (option: any, i: number) => (
                                <MenuItem
                                  key={i}
                                  value={option.id}
                                >
                                  {option.name}
                                </MenuItem>
                              ))}
                          </Field>
                        </Grid>
                        <Grid item={true} xs={7}>
                          <Field
                            component={TextFieldControl}
                            select={true}
                            SelectProps={{
                              autoWidth: true
                            }}
                            name={`${name}.media`}
                            label="Media"
                          >
                            {userConfig.data['media-list'].map(
                              // TODO: remove any
                              // tslint:disable-next-line:no-any
                              (option: any, i: number) => (
                                <MenuItem
                                  key={i}
                                  value={option.id}
                                >
                                  {option.displayName}
                                </MenuItem>
                              ))}
                          </Field>
                        </Grid>
                        <Grid
                          className={classes.addProfileBtnContainer}
                          item={true}
                          xs={2}
                        >
                          <Button
                            variant="raised"
                            className={classes.addProfileBtn}
                            onClick={() => fields.push({})}
                          >
                            Add Profile
                          </Button>
                        </Grid>
                      </React.Fragment>
                    ))}
                </FieldArray>
                <Grid item={true} xs={12} className={classes.saveBtnContainer}>
                  <Button
                    variant="raised"
                    type="submit"
                    className={classes.greenBtn}
                  >
                    Save
                  </Button>
                </Grid>
              </Grid>
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

  },
  addProfileBtnContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-start'
  },
  addProfileBtn: {
    backgroundColor: '#4682C3',
    color: 'white',
    '&:hover': {
      backgroundColor: '#3e76b2',
      color: 'white'
    },
    '&:not(:first-child)': {
      marginLeft: theme.spacing.unit * 2,
    }
  },
  removeBtnContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-start'
  },
  removeBtn: {
    backgroundColor: '#d2d2d2',
    borderRadius: 3,
    color: '#a22a21'
  },
  greenBtn: {
    color: 'white',
    backgroundColor: '#559542',
    '&:hover': {
      backgroundColor: '#518E45',
    },
    '&:not(:first-child)': {
      marginLeft: theme.spacing.unit * 2,
    }
  },
  saveBtnContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-end'
  }
} as React.CSSProperties));

export default decorate<TestPropertyFormProps>(TestPropertyForm);