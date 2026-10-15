// src/pages/VerifyEmail.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const VerifyEmailPage = () => {
  const [message, setMessage] = useState<string>("Verificando tu cuenta...");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (!token) {
      setMessage("❌ Token requerido. Por favor, usa el enlace válido del correo.");
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        // Llamada directa al backend para verificar el token
        const response = await axios.get(`/api/auth/verify-email?token=${token}`);
        
        // Si llega aquí, la verificación fue exitosa
        setMessage("✅ ¡Email verificado correctamente! Redirigiendo a tu perfil...");
        
        // Esperar 2 segundos y redirigir
        setTimeout(() => {
          navigate("/perfil", { replace: true });
        }, 2000);

      } catch (err: any) {
        console.error("Error al verificar email:", err);
        const errorMsg = err.response?.data?.error || 
                         err.message || 
                         "No se pudo verificar el email. Intenta nuevamente.";
        setMessage(`❌ Error: ${errorMsg}`);
        setLoading(false);
      }
    };

    verifyToken();
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-lg">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          {loading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600"></div>
          ) : (
            <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verificación de Email</h2>
        <p className={`text-lg ${loading ? "text-gray-600" : "text-gray-800"}`}>
          {message}
        </p>
        {!loading && (
          <button
            onClick={() => navigate("/perfil")}
            className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Ir al perfil
          </button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;