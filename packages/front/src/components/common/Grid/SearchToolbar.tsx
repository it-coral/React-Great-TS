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
import { FormControl } from 'material-ui/Form';
import Select from 'material-ui/Select';
import { InputLabel } from 'material-ui/Input';
import { MenuItem } from 'material-ui/Menu';
import { Field, FieldRenderProps, Form } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { FieldArray } from 'react-final-form-arrays';
import TextFieldControl from '../form-elements/TextFieldControl';

type StyledComponent = WithStyles<'searchField' |
    'searchCell' |
    'searchBtn'>;

export interface SearchToolbarProps {
    value: string;
    placeholder: string;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onResetSearch: () => void;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

class SearchToolbar extends React.Component<SearchToolbarProps & StyledComponent> {
    render() {
        const {
            classes,
            onResetSearch,
            onSubmit,
            placeholder,
        } = this.props;
        return (
            <TableCell
                className={classes.searchCell}
            >
                <Form
                    onSubmit={onSubmit}
                    initialValues={{filter: [{}]}}
                    mutators={{
                        ...arrayMutators
                    }}
                    render={({handleSubmit, submitError}) => (
                        <form
                            onSubmit={handleSubmit}
                        >
                            <FieldArray name="filter">
                                {({ fields }) =>
                                    fields.map((name, index) => (
                                        <React.Fragment key={index}>
                                            <Field
                                                component={TextFieldControl}
                                                type="number"
                                                name={`${name}.field`}
                                                label="Filed"
                                            />
                                        </React.Fragment>
                                    ))}
                            </FieldArray>

                            <FormControl>
                                <InputLabel>Age</InputLabel>
                                <Select
                                    value={20}
                                    inputProps={{
                                        name: 'age',
                                        id: 'age-simple',
                                    }}
                                >
                                    <MenuItem value={10}>Ten</MenuItem>
                                    <MenuItem value={20}>Twenty</MenuItem>
                                    <MenuItem value={30}>Thirty</MenuItem>
                                </Select>
                            </FormControl>
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
                                                        onClick={onResetSearch}
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
                        </form>
                    )}
                />
            </TableCell>
        );
    }
}

const styles = (theme: Theme) => ({
    searchField: {
        width: 245,
        marginRight: theme.spacing.unit
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