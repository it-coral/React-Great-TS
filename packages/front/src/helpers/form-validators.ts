export default class FormValidators {
    static required(value: string) {
        return (value ? undefined : 'This field is required');
    }

    static isEmail(value: string) {
        let regex = /^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/;
        return regex.test(String(value)) ? undefined : 'This is not an valid email';
    }

    static composeValidators = (...validators: ((value: string) => void)[]) => (value: string) =>
        validators.reduce((error, validator) => error || validator(value), undefined)
}