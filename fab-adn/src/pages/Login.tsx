import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { login, isAuthenticated } from '@/lib/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE } from '@/api/config';

const redirectByRole = (rol: string, navigate: any) => {
  switch (rol) {
    case "admin": return navigate("/admin/dashboard", { replace: true });
    case "cliente": return navigate("/cliente/home", { replace: true });
    default: return navigate("/empleado/dashboard", { replace: true });
  }
};

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Restaurar datos recordados si existen
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setCredentials(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      redirectByRole(user.rol, navigate);
      return;
    }

    const token = searchParams.get("token");
    const userParam = searchParams.get("user");
    const error = searchParams.get("error");

    if (error) {
      toast({ title: "Error", description: decodeURIComponent(error), variant: "destructive" });
      navigate('/login', { replace: true });
      return;
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("rol", user.rol);
        toast({ title: "Acceso concedido", description: "Bienvenido con Google" });
        redirectByRole(user.rol, navigate);
      } catch {
        navigate('/login', { replace: true });
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await login(credentials.email, credentials.password);
      localStorage.setItem("rol", data.user.rol);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (rememberMe) {
        localStorage.setItem("remembered_email", credentials.email);
      } else {
        localStorage.removeItem("remembered_email");
      }

      toast({ title: "Acceso concedido", description: "Bienvenido al sistema" });
      redirectByRole(data.user.rol, navigate);
    } catch (error: any) {
      toast({ title: "Error de autenticación", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/10" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="card-adn">
          <div className="p-8">
            <div className="text-center mb-8">
              <motion.div
                className="flex justify-center mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
              >
                <div className="p-4 bg-primary/10 rounded-full">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </motion.div>

              <h1 className="text-2xl font-black text-foreground mb-2">
                Inicio de <span className="text-primary">Sesión</span>
              </h1>
              <p className="text-muted-foreground text-sm">
                Accede a tu cuenta de ADN Motors
              </p>
            </div>


            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" placeholder="tu@correo.com" value={credentials.email} onChange={handleInputChange} className="pl-10" required disabled={isLoading} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Ingrese su contraseña" value={credentials.password} onChange={handleInputChange} className="pl-10 pr-10" required disabled={isLoading} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Recordar mi correo</span>
                </label>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button type="submit" className="w-full btn-hero" disabled={isLoading}>
                  {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
                </Button>
              </motion.div>

              <motion.div
                className="text-center space-y-3 pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <p className="text-sm text-muted-foreground">No tienes una cuenta?</p>
                <Button variant="outline" onClick={() => navigate('/registro')} disabled={isLoading} className="w-full border-primary/30 hover:border-primary/60">
                  Crear cuenta
                </Button>
              </motion.div>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                ADN Motors &mdash; Taller Automotriz Profesional
              </p>
            </div>
          </div>
        </div>

        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground" disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al sitio principal
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
