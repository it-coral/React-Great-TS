import decode from 'jwt-decode';
import auth0 from 'auth0-js';
import { 
  CLIENT_ID, 
  CLIENT_DOMAIN, 
  REDIRECT, 
  SCOPE, 
  AUDIENCE, 
  ID_TOKEN_KEY, 
  ACCESS_TOKEN_KEY 
} from '../constants/Auth0';

export default class Auth0Service {
  auth: any;

  constructor() {
    this.auth = new auth0.WebAuth({
      clientID: CLIENT_ID,
      domain: CLIENT_DOMAIN
    });
  }

  public login() {
    this.auth.authorize({
      responseType: 'token id_token',
      redirectUri: REDIRECT,
      audience: AUDIENCE,
      scope: SCOPE
    });
  }

  public logout() {
    this.clearIdToken();
    this.clearAccessToken();
  }

  public requireAuth(nextState: Object, replace: Function) {
    if (!this.loggedIn()) {
      replace({pathname: '/'});
    }
  }

  public getIdToken() {
    return localStorage.getItem(ID_TOKEN_KEY);
  }

  public getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  public clearIdToken() {
    localStorage.removeItem(ID_TOKEN_KEY);
  }

  public clearAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  // Helper function that will allow us to extract the access_token and id_token
  public getParameterByName(name: string) {
    let match = RegExp('[#&]' + name + '=([^&]*)').exec(window.location.hash);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  }

  // Get and store access_token in local storage
  public setAccessToken() {
    let accessToken = this.getParameterByName('access_token') || '';
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  // Get and store id_token in local storage
  public setIdToken() {
    let idToken: string = this.getParameterByName('id_token') || '';
    localStorage.setItem(ID_TOKEN_KEY, idToken);
  }

  public loggedIn() {
    const idToken = this.getIdToken();
    return !!idToken && !this.isTokenExpired(idToken);
  }

  public getTokenExpirationDate(encodedToken: string) {
    const token = decode(encodedToken);
    if (!token.exp) { return null; }

    const date = new Date(0);
    date.setUTCSeconds(token.exp);

    return date;
  }

  public isTokenExpired(token: string) {
    const expirationDate = this.getTokenExpirationDate(token) || new Date();
    return expirationDate < new Date();
  }

}