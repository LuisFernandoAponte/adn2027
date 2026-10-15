import { useState } from "react";
import { buscarClientes, obtenerCitasCliente } from "@/api/clienteApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  token: string;
  onClienteSelect?: (clienteNombre: string | null) => void;
}

const ClienteSearch = ({ token, onClienteSelect }: Props) => {
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [citas, setCitas] = useState<any[]>([]);

  const handleBuscar = async (valor: string) => {
    setBusqueda(valor);

    if (valor.length < 2) {
      setClientes([]);
      if (valor.length === 0) {
        setClienteSeleccionado(null);
        setCitas([]);
        onClienteSelect?.(null);
      }
      return;
    }

    const data = await buscarClientes(valor, token);
    if (data.success) setClientes(data.clientes);
  };

  const seleccionarCliente = async (cliente: any) => {
    setClienteSeleccionado(cliente);
    setClientes([]);
    setBusqueda(cliente.nombre);
    onClienteSelect?.(cliente.nombre);

    const data = await obtenerCitasCliente(cliente.id, token);
    if (data.success) setCitas(data.citas);
  };

  return (
  <div className="relative w-64">
    
    <input
      type="text"
      placeholder="Buscar cliente..."
      value={busqueda}
      onChange={(e) => handleBuscar(e.target.value)}
      className="w-full border border-border rounded-md px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800"
    />

    {clientes.length > 0 && (
      <div className="absolute left-0 w-full mt-1 bg-white dark:bg-gray-800 border border-border rounded-md shadow-md z-50">
        {clientes.map((c) => (
          <div
            key={c.id}
            onClick={() => seleccionarCliente(c)}
            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-black dark:text-white"
          >
            {c.nombre}
          </div>
        ))}
      </div>
    )}

  </div>
);
};

export default ClienteSearch;