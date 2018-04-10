import { AxiosResponse } from 'axios';
import AxiosFactory from './AxiosFactory';
import ApiPath from '../constants/ApiPath';

interface LoginResponse {
    token: string;
    expires: string;
}

export default class AuthService {
    public login(email: string, pasword: string) {
        let axiosFactory = new AxiosFactory();
        return axiosFactory.axios.post(`${ApiPath.auth.loginLocal}`,
                                       {email: email, password: pasword}, {validateStatus: status => status < 500})
            .then((res: AxiosResponse<LoginResponse>) => {
                if (res.status === 200) {
                    this.setToken(res.data.token);
                    this.setExpires(res.data.expires);
                    return Promise.resolve(res.data);
                } else {
                    return Promise.reject(res.data);
                }
            });
    }

    public logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('expires');
    }

    public loggedIn(): boolean {
        const token = this.getToken();
        const expires = this.getExpires();
        return !!token && !this.isTokenExpired(expires);
    }

    public getToken(): string {
        let token = localStorage.getItem('token');
        return token !== null ? token : '';
    }

    private setToken(token: string) {
        localStorage.setItem('token', token);
    }

    private setExpires(expires: string) {
        localStorage.setItem('expires', expires);
    }

    private getExpires(): number {
        let expires = localStorage.getItem('expires');
        let parsedExpiresDate = Date.parse(expires !== null ? expires : '');
        if (isNaN(parsedExpiresDate)) {
            return 0;
        }
        return parsedExpiresDate;
    }

    private isTokenExpired(expires: number): boolean {
        try {
            return expires < Date.now() / 1000;
        } catch (err) {
            return false;
        }
    }
}