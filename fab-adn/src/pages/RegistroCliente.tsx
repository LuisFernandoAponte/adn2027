import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Lock, Phone, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/api/config";

const RegistroCliente: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: "",
    email: "",
    password: "",
    confirmPassword: "",
    telefono: "",
    direccion: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_completo: form.nombre_completo,
          email: form.email,
          password: form.password,
          telefono: form.telefono || null,
          direccion: form.direccion || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: "Registro exitoso", description: data.message });
      navigate(`/verificar-email?email=${encodeURIComponent(form.email)}`);
    } catch (err: any) {
      toast({ title: "Error de registro", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="card-adn">
          <div className="p-8">
            <div className="text-center mb-8">
              <motion.div
                className="flex justify-center mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="p-4 bg-primary/20 rounded-full">
                  <User className="h-8 w-8 text-primary" />
                </div>
              </motion.div>

              <h1 className="text-2xl font-black text-foreground mb-2">
                Crear <span className="text-primary">Cuenta</span>
              </h1>
              <p className="text-muted-foreground text-sm">
                Regístrate para agendar citas en ADN Motors
              </p>
            </div>


            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre_completo">Nombre completo</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="nombre_completo" name="nombre_completo" placeholder="Juan Pérez" value={form.nombre_completo} onChange={handleChange} className="pl-10" required />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" placeholder="tu@correo.com" value={form.email} onChange={handleChange} className="pl-10" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" name="password" type="password" placeholder="Mín. 6 caracteres" value={form.password} onChange={handleChange} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repetir" value={form.confirmPassword} onChange={handleChange} className="pl-10" required />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono (opcional)</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="telefono" name="telefono" placeholder="70000000" value={form.telefono} onChange={handleChange} className="pl-10" />
                </div>
              </div>

              <div>
                <Label htmlFor="direccion">Dirección (opcional)</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="direccion" name="direccion" placeholder="Av. Principal #123" value={form.direccion} onChange={handleChange} className="pl-10" />
                </div>
              </div>

              <Button type="submit" className="w-full btn-hero" disabled={isLoading}>
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Al registrarte aceptas nuestros términos y condiciones
              </p>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <Button variant="ghost" className="w-full" onClick={() => navigate('/login')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                ¿Ya tienes cuenta? Inicia sesión
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegistroCliente;
