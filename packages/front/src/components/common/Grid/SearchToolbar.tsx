import * as React from 'react';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import {
  TableCell,
} from 'material-ui/Table';
import TextField from 'material-ui/TextField';
import IconButton from 'material-ui/IconButton';
import { InputAdornment } from 'material-ui/Input';
import Search from 'material-ui-icons/Search';
import Cancel from 'material-ui-icons/Cancel';
import { Field, FieldRenderProps, Form, FormSpy } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { FieldArray } from 'react-final-form-arrays';
import SelectFieldControl from '../form-elements/SelectFieldControl';
import { GridFilter } from './index';
import { debounce } from 'lodash';

type StyledComponent = WithStyles<'searchField' |
  'searchCell' |
  'searchBtn' |
  'filterField'>;

export interface SearchToolbarProps {
  placeholder: string;
  onSubmit: (e: any) => void; // tslint:disable-line
  filters?: Array<GridFilter>;
  colSpan: number;
}

interface IFilterValue {
  [key: string]: string | number;
}

export interface ISearchToolbarInitialValues {
  filter?: Array<IFilterValue>;
  searchField?: string;
}

interface ISearchbarToolbarState {
  formInitialValues: ISearchToolbarInitialValues;
}

class SearchToolbar extends React.Component<SearchToolbarProps & StyledComponent, ISearchbarToolbarState> {
  constructor(props: SearchToolbarProps & StyledComponent) {
    super(props);

    this.state = {
      formInitialValues: {}
    };
  }

  componentDidMount() {
    this.setData(this.props);
  }

  componentWillReceiveProps(nextProps: SearchToolbarProps) {
    this.setData(nextProps);
  }

  setData(props: SearchToolbarProps) {
    let initialValues: ISearchToolbarInitialValues = {};

    if (props.filters !== undefined &&
      this.state.formInitialValues.filter === undefined && props.filters.length !== 0) {
      initialValues = {filter: []};
      props.filters.forEach(filter => {
        if (filter.value === undefined && initialValues.filter !== undefined) {
          initialValues.filter.push({});
        } else if (initialValues.filter !== undefined) {
          let filterInitialValue = {};
          filterInitialValue[filter.fieldName] = filter.value;
          initialValues.filter.push(filterInitialValue);
        }
      });

      this.setState({
        formInitialValues: initialValues,
      });
    }
  }

  render() {
    const {
      classes,
      onSubmit,
      placeholder,
      colSpan,
      filters
    } = this.props;

    let submit: () => void;

    const debouncedSubmit = debounce(() => submit(), 200);

    return (
      <TableCell
        colSpan={colSpan}
        className={classes.searchCell}
      >
        <Form
          onSubmit={onSubmit}
          initialValues={this.state.formInitialValues}
          mutators={{
            ...arrayMutators,
          }}
          render={({handleSubmit, submitError, change}) => {
            submit = handleSubmit;

            return (<form
              onSubmit={handleSubmit}
            >
              {filters !== undefined &&
              <FieldArray name="filter">
                {({fields}) =>
                  fields.map((name, index) => (
                    <React.Fragment key={index}>
                      <div className={classes.filterField}>
                        <Field
                          component={SelectFieldControl}
                          name={`${name}.${filters[index].fieldName}`}
                          label="Filter"
                          emptyOption={false}
                          options={filters[index].filterValues}
                        />
                      </div>
                    </React.Fragment>
                  ))}
              </FieldArray>
              }

              <Field
                type="text"
                name={`searchField`}
                label="Filed"
                render={(props: FieldRenderProps) => (
                  <TextField
                    value={props.input.value}
                    onChange={props.input.onChange}
                    className={classes.searchField}
                    placeholder={placeholder}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">
                        {props.input.value &&
                        <IconButton
                          className={classes.searchBtn}
                          aria-label="clear"
                          onClick={() => change('searchField', '')}
                        >
                          <Cancel/>
                        </IconButton>
                        }
                        <IconButton
                          className={classes.searchBtn}
                          type="submit"
                          aria-label="search"
                        >
                          <Search/>
                        </IconButton>
                      </InputAdornment>
                    }}
                  />
                )}
              />
              <FormSpy
                subscription={{values: true}}
                onChange={(values) => {
                  debouncedSubmit();
                }}
              />
            </form>);
          }}
        />
      </TableCell>
    );
  }
}

const styles = (theme: Theme) => ({
  searchField: {
    width: 245,
    marginRight: theme.spacing.unit,
    display: 'inline-flex'
  },
  filterField: {
    display: 'inline-flex',
    width: 100,
    marginRight: theme.spacing.unit,
  },
  searchCell: {
    paddingRight: 0,
    minWidth: 373
  },
  searchBtn: {
    width: 30,
    height: 30
  }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<SearchToolbarProps>(SearchToolbar);