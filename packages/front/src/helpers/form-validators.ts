export default class FormValidators {
  static required = (message: string = '') => (value: string) => {
    let returnMessage = `This field is required`;
    if (message !== '') {
      returnMessage = message;
    }
    return (value ? undefined : returnMessage);
  }

  static isEmail(value: string) {
    let regex = /^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/;
    return regex.test(String(value)) ? undefined : 'This is not an valid email';
  }

  static isURL(value: string) {
    let regex =
      /^((http(s)?|ftp)(:\/\/))?([www])?\.?[a-zA-Z0-9-_\.]+(\.[a-zA-Z0-9]{2,})([-a-zA-Z0-9:%_\+.~#?&//=]*)/gi;
    return regex.test(String(value)) ? undefined : 'This is not an valid URL address';
  }

  static minValue = (length: number, message: string = '') => (value: string) => {
    let returnMessage = `Field bust be at least ${length} characters`;
    if (message !== '') {
      returnMessage = message;
    }

    if (value === undefined) {
      return undefined;
    } else {
      return value.length < length ? returnMessage : undefined;
    }
  }

  static composeValidators = (...validators: ((value: string) => void)[]) => (value: string) =>
    validators.reduce((error, validator) => error || validator(value), undefined)
}