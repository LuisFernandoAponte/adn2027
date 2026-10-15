import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { getTokenExpiration } from "@/lib/tokenUtils";
import { logout } from "@/lib/auth";
import { refreshToken } from "@/api/authApi";

const SessionWatcher = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const expTime = getTokenExpiration(token);
    if (!expTime) return;

    const now = Date.now();
    const timeLeft = expTime - now;

    if (timeLeft <= 0) return;

    // Mostrar aviso sólo si faltan más de 60 segundos
    const warningTime = timeLeft - 60000;

    let warningTimer: any = null;
    if (warningTime > 0) {
      warningTimer = setTimeout(() => {
        setShowModal(true);
      }, warningTime);
    }

    const logoutTimer = setTimeout(() => {
      logout();
      window.location.href = "/login";
    }, timeLeft);

    return () => {
      if (warningTimer) clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };
  }, []);

  const extendSession = async() => {
    try {
      await refreshToken();
      setShowModal(false);

    } catch (error) {
      logout();
      window.location.href="/login";
    }
    
  };

  const cancelSession = () => {
    logout();
    window.location.href = "/login";
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="bg-zinc-900 p-6 rounded-xl w-96 text-white space-y-4">
        <h2 className="text-xl font-bold text-red-500">
          Sesión por expirar
        </h2>

        <p>
          Tu sesión está por finalizar.  
          ¿Deseas extenderla?
        </p>

        <div className="flex justify-end space-x-2">
          <button
            onClick={cancelSession}
            className="bg-gray-600 px-4 py-2 rounded"
          >
            Cancelar
          </button>

          <button
            onClick={extendSession}
            className="bg-red-600 px-4 py-2 rounded"
          >
            Extender sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWatcher;