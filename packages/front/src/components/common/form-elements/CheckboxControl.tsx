import * as React from 'react';
import { FormControlLabel, FormHelperText, FormControl } from 'material-ui/Form';
import Checkbox from 'material-ui/Checkbox';
import { FieldRenderProps } from 'react-final-form';
import { ChangeEvent } from 'react';

interface ICheckboxFieldControl {
    label?: string | HTMLElement;
}

class CheckboxControl extends React.Component<FieldRenderProps & ICheckboxFieldControl> {
    constructor(props: FieldRenderProps) {
        super(props);

        this.handleChange = this.handleChange.bind(this);
    }

    public render(): JSX.Element {
        const {input: { name, value }, meta} = this.props;
        const valueStr = value.toString();

        return (
            <FormControl error={true}>
                <FormControlLabel
                    control={
                        <Checkbox
                            name={name}
                            checked={value}
                            onChange={this.handleChange}
                            value={valueStr}
                        />
                    }
                    label={this.props.label}
                />
                {(meta.touched && (meta.error || meta.submitError)) &&
                    <FormHelperText>{(meta.error || meta.submitError)}</FormHelperText>
                }
            </FormControl>
        );
    }

    private handleChange(e: ChangeEvent<HTMLInputElement>, checked: boolean) {
        if (checked) {
            this.props.input.onChange(true);
        } else {
            this.props.input.onChange(false);
        }
    }
}

export default CheckboxControl;