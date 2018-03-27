import * as React from 'react';
import { storiesOf, RenderFunction } from '@storybook/react';
import ThemeProvider from '../src/testHelpers/ThemeProvider';
import { Field, Form } from 'react-final-form';
import TextFieldControl from '../src/components/common/form-elements/TextFieldControl';
import FormValidators from '../src/helpers/form-validators';

storiesOf('Form elements', module)
    .addDecorator((story: RenderFunction) => <ThemeProvider story={story()}/>)
    .addDecorator((story: RenderFunction) => (
        <Form
            onSubmit={() => undefined}
            render={({handleSubmit}) => (
                <form onSubmit={handleSubmit}>
                    {story()}
                </form>
            )}
        />
    ))
    .add('Text field', () =>
        (
            <Field
                component={TextFieldControl}
                type="text"
                name="some-field"
                placeholder="Some text"
            />
        )
    )
    .add('Numeric field', () =>
        (
            <Field
                component={TextFieldControl}
                type="number"
                name="some-numbers"
                placeholder="Some digits"
            />
        )
    )
    .add('Validation required', () =>
        (
            <Field
                component={TextFieldControl}
                type="password"
                name="password"
                placeholder="Password"
                label="Password"
                validate={FormValidators.required}
            />
        )
    )
    .add('Validation required and email', () =>
        (
            <Field
                component={TextFieldControl}
                type="text"
                name="email"
                placeholder="Email"
                label="Email"
                validate={FormValidators.composeValidators(FormValidators.required,
                    FormValidators.isEmail)}
            />
        )
    );