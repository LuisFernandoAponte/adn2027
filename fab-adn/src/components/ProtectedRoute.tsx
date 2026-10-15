import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getToken, getUser } from "../lib/auth";

interface Props {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<Props> = ({ children, allowedRoles }) => {

  const token = getToken();
  const user = getUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded: any = jwtDecode(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("permisos");
      return <Navigate to="/login?expired=true" replace />;
    }
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("permisos");
    return <Navigate to="/login" replace />;
  }

  const userRolStr = (typeof user.rol === "string" ? user.rol : user.rol?.descripcion || "").toLowerCase();
  const allowedNorm = allowedRoles.map(r => r.toLowerCase());
  const isAdmin = userRolStr === "admin" || userRolStr === "administrador";

  if (!allowedNorm.includes(userRolStr) && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;