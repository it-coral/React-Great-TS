import * as React from 'react';
import { Field, Form } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { FieldArray } from 'react-final-form-arrays';
import { withStyles, WithStyles } from 'material-ui/styles';
import Grid from 'material-ui/Grid';
import TextFieldControl from '../../components/common/form-elements/TextFieldControl';
import CheckboxControl from '../../components/common/form-elements/CheckboxControl';
import FormValidators from '../../helpers/form-validators';
import Paper from 'material-ui/Paper';
import MenuItem from 'material-ui/Menu/MenuItem';
import Button from 'material-ui/Button';
import { ITestPropertyForm } from './index';
import Divider from 'material-ui/Divider';
import IconButton from 'material-ui/IconButton';
import RemoveCircleOutline from '@material-ui/icons/RemoveCircleOutline';
import Tooltip from 'material-ui/Tooltip';

interface TestPropertyFormProps {
  // TODO: remove any
  // tslint:disable-next-line:no-any
  userConfig: any;
  // TODO: remove any
  // tslint:disable-next-line:no-any
  initialValues?: any;
  newMode: boolean;
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
  'saveBtnContainer' |
  'tooltipLabel' |
  'editBtn'
  >;

class TestPropertyForm extends React.Component<TestPropertyFormProps & StyledComponent> {
  render() {
    const {
      classes,
      userConfig,
      initialValues,
      onSubmit,
      // newMode
    } = this.props;
    return (
      <Grid
        container={true}
        spacing={16}
      >
        <Grid item={true} xs={12}>
          <Paper className={classes.root}>
            <Form
              onSubmit={onSubmit}
              initialValues={initialValues}
              mutators={{
                ...arrayMutators
              }}
              render={({ handleSubmit, submitError }) => (
                <form
                  className={classes.formRoot}
                  onSubmit={handleSubmit}
                >
                  <Grid
                    container={true}
                    spacing={16}
                  >
                    <Grid item={true} xs={12} className={classes.saveBtnContainer}>
                      <Button
                        variant="raised"
                        type="submit"
                        color="secondary"
                        className={classes.greenBtn}
                      >
                        Save
                      </Button>
                    </Grid>
                    <Grid item={true} xs={12}>
                      <Field
                        component={TextFieldControl}
                        type="text"
                        name="name"
                        label="Test Name"
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
                    <Grid item={true} xs={12}>
                      <Grid
                        container={true}
                        spacing={16}
                      >
                        <Grid item={true} md={3} xs={12}>
                          <Field
                            component={TextFieldControl}
                            type="number"
                            name="parameters.concurrentUsers"
                            label="Concurrent probes"
                          />
                        </Grid>
                        <Grid item={true} md={3} xs={12}>
                          <Field
                            component={TextFieldControl}
                            type="number"
                            name="parameters.loopCount"
                            label="Iterations"
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item={true} xs={12}>
                      <Field
                        component={TextFieldControl}
                        type="text"
                        name="runOptions"
                        label="Run Options"
                      />
                    </Grid>
                    <Grid item={true} lg={2} sm={3} xs={12}>
                      <Field
                        name="serviceUrlOpen"
                        component={CheckboxControl}
                        type="checkbox"
                        label={
                          <div>
                            <span>Auto </span>
                            <Tooltip
                              title="Make sure to enable popup windows"
                              placement="top"
                            >
                              <span
                                className={classes.tooltipLabel}
                              >
                                Save
                              </span>
                            </Tooltip>
                          </div>}
                      />
                    </Grid>
                    <Grid item={true} lg={10} sm={9} xs={12}>
                      <Field
                        component={TextFieldControl}
                        type="text"
                        name="serviceUrl"
                        label="Service URL"
                        placeholder="https://...."
                        validate={FormValidators.isURL}
                      />
                    </Grid>
                    <Grid item={true} xs={12}>
                      <Button
                        variant="raised"
                        color="secondary"
                        onClick={() => alert('not yet ready')}
                      >
                        Upload
                      </Button>
                      <Button
                        variant="raised"
                        color="secondary"
                        className={classes.editBtn}
                        onClick={() => alert('not yet ready')}
                      >
                        Edit
                      </Button>
                      <Tooltip
                        title="Now FREE, We will love to write or debug the script for you!"
                        placement="top"
                      >
                        <Button
                          variant="raised"
                          className={classes.addProfileBtn}
                          onClick={() => alert('not yet ready')}
                        >
                          Request Help
                        </Button>
                      </Tooltip>
                    </Grid>
                    <FieldArray name="testProfiles">
                      {({ fields }) =>
                        fields.map((name, index) => (
                          <React.Fragment key={index}>
                            <Grid item={true} xs={12}>
                              <Divider />
                            </Grid>
                            <Grid item={true} xs={12} md={6}>
                              <Grid
                                container={true}
                                spacing={16}
                              >
                                <Grid item={true} sm={6} xs={12}>
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
                                <Grid item={true} sm={6} xs={12}>
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
                                <Grid item={true} sm={6} xs={12}>
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
                                <Grid item={true} sm={6} xs={12}>
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
                                <Grid item={true} sm={6} xs={12}>
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
                              </Grid>
                            </Grid>
                            <Grid
                              className={classes.removeBtnContainer}
                              item={true}
                              md={6}
                              xs={12}
                            >
                              {index > 0 && <IconButton
                                onClick={() => fields.pop()}
                                color="primary"
                                className={classes.removeBtn}
                              >
                                <RemoveCircleOutline />
                              </IconButton>}
                            </Grid>
                            {index === (fields.length ? fields.length - 1 : -1) && <Grid
                              className={classes.addProfileBtnContainer}
                              item={true}
                              md={6}
                              xs={12}
                            >
                              <Button
                                variant="raised"
                                className={classes.addProfileBtn}
                                onClick={() => fields.push({})}
                              >
                                Add Profile
                              </Button>
                            </Grid>}
                          </React.Fragment>
                        ))}
                    </FieldArray>
                    <Grid item={true} xs={12} className={classes.saveBtnContainer}>
                      <Button
                        variant="raised"
                        type="submit"
                        color="secondary"
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
        </Grid>
      </Grid>
    );
  }
}

const decorate = withStyles(theme => ({
  root: {
    width: '100%',
    height: 'auto',
    padding: theme.spacing.unit * 3
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
    alignItems: 'flex-start',
    justifyContent: 'flex-start'
  },
  removeBtn: {
    backgroundColor: '#d2d2d2',
    borderRadius: 3,
    color: '#a22a21'
  },
  greenBtn: {
    '&:not(:first-child)': {
      marginLeft: theme.spacing.unit * 2,
    }
  },
  editBtn: {
    marginLeft: theme.spacing.unit * 2,
    marginRight: theme.spacing.unit * 2
  },
  saveBtnContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-end'
  },
  tooltipLabel: {
    color: '#4682C3'
  }
} as React.CSSProperties));

export default decorate<TestPropertyFormProps>(TestPropertyForm);