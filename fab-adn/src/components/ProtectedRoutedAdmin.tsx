import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getToken, getUser } from "@/lib/auth";

const ProtectedRouteAdmin = ({ children }) => {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
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

  const rolStr = (typeof user.rol === "string" ? user.rol : user.rol?.descripcion || "").toLowerCase();
  if (rolStr !== "admin" && rolStr !== "administrador") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRouteAdmin;