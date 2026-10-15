import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/api/config";

const VerificarEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const emailFromParams = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromParams);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [codeSent, setCodeSent] = useState(!!emailFromParams);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailFromParams) {
      setCodeSent(true);
    }
  }, [emailFromParams]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendCode = async () => {
    if (!email) { toast({ title: "Error", description: "Ingresa tu correo electrónico", variant: "destructive" }); return; }
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCodeSent(true);
      toast({ title: "Código enviado", description: "Revisa tu bandeja de entrada y spam" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    const codigo = code.join("");
    if (codigo.length !== 6) { toast({ title: "Error", description: "Ingresa el código completo de 6 dígitos", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codigo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("rol", data.user.rol);

      toast({ title: "Email verificado", description: "Tu cuenta ha sido verificada exitosamente" });

      if (data.user.rol === "cliente") navigate("/cliente/home", { replace: true });
      else if (data.user.rol === "admin") navigate("/admin/dashboard", { replace: true });
      else navigate("/empleado/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Código incorrecto", description: err.message, variant: "destructive" });
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
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
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
              </motion.div>

              <h1 className="text-2xl font-black text-foreground mb-2">
                Verifica tu <span className="text-primary">Email</span>
              </h1>
              <p className="text-muted-foreground text-sm">
                Te hemos enviado un código de 6 dígitos a tu correo
              </p>
            </div>

            <div className="space-y-6">
              {!codeSent ? (
                <div className="space-y-4">
                  <Label htmlFor="email">Correo electrónico registrado</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button className="w-full" onClick={handleSendCode} disabled={isSending}>
                    <Mail className="h-4 w-4 mr-2" />
                    {isSending ? "Enviando..." : "Enviar código"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Código enviado a</p>
                    <p className="text-sm font-medium">{email}</p>
                  </div>

                  <div className="flex justify-center gap-2">
                    {code.map((digit, i) => (
                      <Input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  <Button className="w-full" onClick={handleVerify} disabled={isLoading || code.join("").length !== 6}>
                    {isLoading ? "Verificando..." : "Verificar código"}
                  </Button>

                  <div className="text-center">
                    <Button variant="link" size="sm" onClick={handleSendCode} disabled={isSending}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reenviar código
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <Button variant="ghost" className="w-full" onClick={() => navigate('/login')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al inicio de sesión
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerificarEmail;
