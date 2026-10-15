import { jwtDecode } from "jwt-decode";

export const getTokenExpiration = (token: string) => {
  try {
    const decoded: any = jwtDecode(token);
    return decoded.exp * 1000; 
  } catch {
    return null;
  }
};