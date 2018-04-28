import * as React from 'react';
import { FormControl, FormHelperText } from 'material-ui/Form';
import { FieldRenderProps } from 'react-final-form';
import withStyles from 'material-ui/styles/withStyles';
import { WithStyles } from 'material-ui/styles';
import Select from 'material-ui/Select';
import { InputLabel } from 'material-ui/Input';
import { MenuItem } from 'material-ui/Menu';

interface ISelectOption {
    value: string | number;
    label: string;
}

interface ISelectFieldControl {
    label?: string;
    emptyOption?: boolean;
    options: Array<ISelectOption>;
}

class SelectFieldControl extends React.Component<FieldRenderProps & ISelectFieldControl &
    WithStyles<'root' | 'select'>> {
    public render(): JSX.Element {
        const {
            classes,
            input: {
                name,
                onChange,
                value,
                ...restInput
            },
            meta,
            label,
            emptyOption,
            options,
            ...rest
        } = this.props;

        return (
            <FormControl
                {...rest}
                className={classes.root}
            >
                <InputLabel className={classes.select}>{label}</InputLabel>
                <Select
                    inputProps={restInput}
                    value={value}
                    name={name}
                    onChange={onChange}
                    className={classes.select}
                >
                    {emptyOption &&
                        <MenuItem value="">
                            <em>{label}</em>
                        </MenuItem>
                    }
                    {options.map((o, index) => (
                        <MenuItem key={index} value={o.value}>{o.label}</MenuItem>
                    ))}
                </Select>
                {((meta.error || meta.submitError) && meta.touched) &&
                    <FormHelperText>{(meta.error || meta.submitError)}</FormHelperText>
                }
            </FormControl>
        );
    }
}

const decorate = withStyles(() => ({
    root: {
        width: '100%',
        marginTop: 0,
        marginBottom: 0,
        fontSize: '0.95em'
    },
    select: {
        fontSize: '0.95em'
    }
}));

export default decorate<FieldRenderProps>(SelectFieldControl);