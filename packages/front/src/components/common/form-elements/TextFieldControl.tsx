import * as React from 'react';
import TextField from 'material-ui/TextField';
import { FieldRenderProps } from 'react-final-form';
import withStyles from 'material-ui/styles/withStyles';
import { WithStyles } from 'material-ui/styles';

interface ITextFielControl {
    label?: string;
}

class TextFieldControl extends React.Component<FieldRenderProps & ITextFielControl & WithStyles<'root'>> {
    public render(): JSX.Element {
        const {classes, input: { name, onChange, value, ...restInput }, meta, ...rest} = this.props;
        return (
            <TextField
                {...rest}
                className={classes.root}
                label={this.props.label}
                value={value}
                name={name}
                helperText={meta.touched ? (meta.error || meta.submitError) : undefined}
                error={(meta.error || meta.submitError) && meta.touched}
                inputProps={restInput}
                onChange={onChange}
                margin="normal"
            />
        );
    }
}

const decorate = withStyles(() => ({
    root: {
        width: '100%',
        marginTop: 0,
        marginBottom: 0
    }
}));

export default decorate<FieldRenderProps>(TextFieldControl);