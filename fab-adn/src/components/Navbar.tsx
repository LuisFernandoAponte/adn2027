import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Phone, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logout, isAuthenticated, getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [auth, setAuth] = useState(isAuthenticated());
  const [userName, setUserName] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const updateAuth = () => {
      const authenticated = isAuthenticated();
      setAuth(authenticated);
      if (authenticated) {
        const user = getUser();
        setUserName(user?.nombre || user?.email || "Usuario");
      } else {
        setUserName(null);
      }
    };

    updateAuth();
    window.addEventListener("storage", updateAuth);
    return () => window.removeEventListener("storage", updateAuth);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 40);
      setVisible(currentScrollY < 40 || currentScrollY < lastScrollY.current);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setAuth(false);
    setUserName(null);
    setIsOpen(false);
    navigate("/", { replace: true });
  };

  const baseNavItems = [
    { name: 'Inicio', href: '/' },
    { name: 'Servicios', href: '/servicios' },
    { name: 'Mecánicos', href: '/mecanicos' },
    { name: 'Contacto', href: '/contacto' },
    { name: 'Ubicación', href: '/ubicacion' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.header
      className="fixed top-0 w-full z-50 transition-all duration-300"
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -110 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* 🟢 BARRA SUPERIOR ELEGANTE & MINIMALISTA */}
      <div className="bg-neutral-950/90 border-b border-white/10 backdrop-blur-md text-xs text-neutral-300 py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4 font-sans">
          {/* Izquierda: Estado sutil del taller */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-neutral-200 tracking-wide text-[11px] sm:text-xs">
              Abierto hoy
            </span>
            <span className="text-neutral-600 hidden sm:inline">•</span>
            <span className="text-neutral-400 text-[11px] sm:text-xs hidden sm:inline flex items-center gap-1">
              <Clock className="h-3 w-3 inline-block text-neutral-400" /> Atención 8:00 AM – 6:00 PM
            </span>
          </div>

          {/* Centro / Mobile Horario */}
          <div className="sm:hidden text-[11px] text-neutral-400">
            Atención: 8:00 AM a 6:00 PM
          </div>

          {/* Derecha: Ubicación & Teléfono */}
          <div className="hidden md:flex items-center gap-4 text-[11px] font-mono text-neutral-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-red-500" /> Santa Cruz, Bolivia
            </span>
            <span className="text-neutral-700">|</span>
            <a
              href="tel:59177308697"
              className="flex items-center gap-1 text-neutral-300 hover:text-red-400 transition-colors"
            >
              <Phone className="h-3 w-3 text-red-500" /> 77308697
            </a>
          </div>
        </div>
      </div>

      {/* 🧭 NAVBAR PRINCIPAL */}
      <nav className={`transition-all duration-300 ${scrolled ? 'bg-neutral-950/90 border-b border-white/10 backdrop-blur-lg shadow-xl' : 'bg-gradient-to-b from-neutral-950/80 to-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo ADN MOTORS */}
            <Link to="/" className="flex items-center space-x-2 group">
              <span className="adn-logo text-2xl sm:text-3xl font-black tracking-wider text-red-500 group-hover:text-red-400 transition-colors">
                ADN
              </span>
              <span className="text-xs sm:text-sm font-bold tracking-widest text-neutral-300 group-hover:text-white transition-colors">
                MOTORS
              </span>
            </Link>

            {/* Menú Desktop */}
            <div className="hidden md:flex items-center space-x-1">
              {baseNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`relative px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                      active
                        ? 'text-white bg-white/10 border border-white/10'
                        : 'text-neutral-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.name}
                    {active && (
                      <motion.span
                        layoutId="activeTab"
                        className="absolute bottom-0 left-3 right-3 h-0.5 bg-red-500 rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}

              <div className="ml-4 pl-4 border-l border-white/10 flex items-center">
                {auth ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-300 font-medium hidden lg:inline">
                      {userName}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5 bg-red-600/90 hover:bg-red-600"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Salir
                    </Button>
                  </div>
                ) : (
                  <Link to="/login">
                    <Button
                      size="sm"
                      className="bg-transparent border border-red-500/40 text-neutral-100 hover:bg-red-600 hover:border-red-600 hover:text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all duration-300 shadow-sm"
                    >
                      Ingresar
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Menú Hamburguesa Mobile */}
            <button
              className="md:hidden p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Menú Desplegable Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="md:hidden bg-neutral-950/95 border-b border-white/10 backdrop-blur-xl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {baseNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-white bg-red-500/10 border border-red-500/30'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-3 mt-3 border-t border-white/10">
                {auth ? (
                  <>
                    <div className="px-4 py-2 text-xs font-mono text-neutral-400">
                      Usuario: {userName}
                    </div>
                    <button
                      onClick={() => { handleLogout(); setIsOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-semibold rounded-xl text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="block px-4 py-3 text-sm font-bold rounded-xl bg-red-600 text-white text-center hover:bg-red-700 transition-colors shadow-md"
                    onClick={() => setIsOpen(false)}
                  >
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;
