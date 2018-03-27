import * as React from 'react';
import { storiesOf, RenderFunction } from '@storybook/react';
import ThemeProvider from '../src/testHelpers/ThemeProvider';
import { Field, Form } from 'react-final-form';
import TextFieldControl from '../src/components/common/form-elements/TextFieldControl';

storiesOf('TextField', module)
    .addDecorator((story: RenderFunction) => <ThemeProvider story={story()}/>)
    .addDecorator((story: RenderFunction) => (
        <Form
            onSubmit={() => {}}
            render={({handleSubmit}) => (
                <form onSubmit={handleSubmit}>
                    {story()}
                </form>
            )}
        />
    ))
    .add('Default', () =>
        <Field
            component={TextFieldControl}
            type="text"
            name="some-field"
            placeholder="Some text"
        />
    )
    .add('Validation error message', () =>
        <Field
            component={TextFieldControl}
            type="password"
            name="password"
            placeholder="Password"
            label="Password"
            validate={required}
        />
    )
    .add('Input text value', () =>
        <Field
            component={TextFieldControl}
            type="text"
            name="text"
            placeholder="Text"
            label="Text"
            input={{value: 'Text value'}}
        />
    );