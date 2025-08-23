/* global firebase */

// v7 - Final com Módulo de Pneus e Alertas
import React, { useState, useEffect } from 'react';
import { 
  Truck, Fuel, Wrench, MapPin, BarChart3, Edit, Trash2, Save, X, LogOut, 
  User, Lock, Users, AlertTriangle, Clock, Calculator, Disc
} from 'lucide-react';

// --- Configuração do Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyBCwbJKf4D3rDWZS37eN-UhtAYyi8-P9So",
  authDomain: "controle-frota-3a8d6.firebaseapp.com",
  projectId: "controle-frota-3a8d6",
  storageBucket: "controle-frota-3a8d6.firebasestorage.app",
  messagingSenderId: "776347690193",
  appId: "1:776347690193:web:b54696a6cd6e117ed411f0"
};
 
// Inicializa o Firebase e conecta aos serviços
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
// --- Fim da Configuração do Firebase ---

const FleetManager = () => {
  // Autenticação
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  
  // Estados principais
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [tires, setTires] = useState([]);
  const [trips, setTrips] = useState([]);
  const [fuelings, setFuelings] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [fines, setFines] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [alerts, setAlerts] = useState([]);

  // Formulários
  const initialVehicleForm = { plate: '', model: '', year: '', type: 'Caminhão Truck', currentKm: 0, fipeValue: 0, licensingDate: '', licensingCost: 0, anttRegistry: '', nextMaintenanceKm: 0 };
  const initialDriverForm = { name: '', cpf: '', birthDate: '', phone: '', email: '', licenseNumber: '', licenseCategory: 'D', licenseExpiry: '', licensePoints: 0, observations: '' };
  const initialTireForm = { brand: '', model: '', purchaseDate: '', cost: 0, vehicleId: '', position: '', initialKm: 0, status: 'Em estoque' };
  const initialTripForm = { vehicleId: '', date: '', origin: '', destination: '', purpose: 'Entrega', initialKm: 0, finalKm: 0, driverId: '' };
  const initialFuelingForm = { vehicleId: '', date: '', km: 0, liters: 0, unitPrice: 0 };
  const initialMaintenanceForm = { vehicleId: '', date: '', type: 'Preventiva', description: '', cost: 0, km: 0, parts: '', services: '', maintenanceCategory: 'Veículo', downTime: 0 };
  const initialFineForm = { vehicleId: '', driverId: '', date: '', description: '', value: 0, infraction: '', points: 0, status: 'Pendente' };

  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);
  const [driverForm, setDriverForm] = useState(initialDriverForm);
  const [tireForm, setTireForm] = useState(initialTireForm);
  const [tripForm, setTripForm] = useState(initialTripForm);
  const [fuelingForm, setFuelingForm] = useState(initialFuelingForm);
  const [maintenanceForm, setMaintenanceForm] = useState(initialMaintenanceForm);
  const [fineForm, setFineForm] = useState(initialFineForm);
  
  // Escuta as mudanças de login
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
        setUser(userDoc.exists ? { ...firebaseUser, ...userDoc.data() } : firebaseUser);
      } else {
        setUser(null);
      }
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  // Carrega os dados do Firestore
  useEffect(() => {
    if (!user) {
      const clearStates = [setVehicles, setFuelings, setMaintenances, setTrips, setDrivers, setFines, setTires];
      clearStates.forEach(setter => setter([]));
      return;
    }

    const loadData = async () => {
      setLoadingData(true);
      try {
        const collections = {
          vehicles: setVehicles, drivers: setDrivers, tires: setTires,
          trips: setTrips, fuelings: setFuelings, maintenances: setMaintenances, fines: setFines
        };
        const promises = Object.keys(collections).map(col => db.collection(col).where("authorUid", "==", user.uid).get());
        const snapshots = await Promise.all(promises);
        
        snapshots.forEach((snapshot, index) => {
          const collectionName = Object.keys(collections)[index];
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          collections[collectionName](data);
        });
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        alert("Não foi possível carregar os dados.");
      }
      setLoadingData(false);
    };
    loadData();
  }, [user]);
  
  // Gera alertas com base nos dados carregados
  useEffect(() => {
      if (vehicles.length === 0 && drivers.length === 0) return;

      const newAlerts = [];
      const today = new Date();
      const alertThreshold = new Date();
      alertThreshold.setDate(today.getDate() + 30); // Alertas para os próximos 30 dias

      drivers.forEach(driver => {
          if (driver.licenseExpiry) {
              const expiryDate = new Date(driver.licenseExpiry);
              if (expiryDate <= alertThreshold) {
                  const message = expiryDate < today 
                      ? `A CNH do motorista ${driver.name} VENCEU em ${expiryDate.toLocaleDateString('pt-BR')}.`
                      : `A CNH do motorista ${driver.name} vence em ${expiryDate.toLocaleDateString('pt-BR')}.`;
                  newAlerts.push({ id: `driver-${driver.id}`, type: 'danger', message });
              }
          }
      });

      vehicles.forEach(vehicle => {
          if (vehicle.licensingDate) {
              const expiryDate = new Date(vehicle.licensingDate);
              if (expiryDate <= alertThreshold) {
                  const message = expiryDate < today
                      ? `Licenciamento do veículo ${vehicle.plate} VENCEU em ${expiryDate.toLocaleDateString('pt-BR')}.`
                      : `Licenciamento do veículo ${vehicle.plate} vence em ${expiryDate.toLocaleDateString('pt-BR')}.`;
                  newAlerts.push({ id: `vehicle-lic-${vehicle.id}`, type: 'danger', message });
              }
          }
          if (vehicle.nextMaintenanceKm > 0 && vehicle.currentKm >= vehicle.nextMaintenanceKm) {
              newAlerts.push({ id: `vehicle-maint-${vehicle.id}`, type: 'warning', message: `Veículo ${vehicle.plate} atingiu o KM para manutenção preventiva.` });
          }
      });

      setAlerts(newAlerts);
  }, [vehicles, drivers]);

  // Funções de Autenticação e CRUD (sem alterações na lógica principal)
  const handleLogin = async (e) => { e.preventDefault(); try { await auth.signInWithEmailAndPassword(loginForm.email, loginForm.password); } catch (error) { alert('Email ou senha incorretos!'); } };
  const handleLogout = () => auth.signOut();
  const saveData = async (collectionName, data, id, formSetter, initialFormState) => { /* ... (código existente) ... */ };
  const handleDelete = async (collectionName, id) => { /* ... (código existente) ... */ };
  
  // Handlers para cada formulário
  const handleSaveVehicle = () => saveData('vehicles', vehicleForm, editingItem?.id, setVehicleForm, initialVehicleForm);
  const handleSaveDriver = () => saveData('drivers', driverForm, editingItem?.id, setDriverForm, initialDriverForm);
  const handleSaveTire = () => saveData('tires', tireForm, editingItem?.id, setTireForm, initialTireForm);
  // ... outros handlers

  // Funções de cálculo de KPIs (sem alterações)
  const calculateKPIs = () => { /* ... */ };
  const kpis = calculateKPIs();

  // Funções Auxiliares (com novas abas)
  const canAccess = (requiredRoles) => user && user.role && requiredRoles.includes(user.role);
  const getAvailableTabs = () => {
    const allTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'manager'] },
      { id: 'vehicles', label: 'Veículos', icon: Truck, roles: ['admin', 'manager'] },
      { id: 'drivers', label: 'Motoristas', icon: Users, roles: ['admin', 'manager'] },
      { id: 'tires', label: 'Pneus', icon: Disc, roles: ['admin', 'manager']},
      { id: 'trips', label: 'Viagens', icon: MapPin, roles: ['admin', 'manager', 'driver'] },
      { id: 'fueling', label: 'Abastecimento', icon: Fuel, roles: ['admin', 'manager', 'driver'] },
      { id: 'maintenance', label: 'Manutenção', icon: Wrench, roles: ['admin', 'manager'] },
      { id: 'fines', label: 'Multas', icon: AlertTriangle, roles: ['admin', 'manager'] }
    ];
    return allTabs.filter(tab => canAccess(tab.roles));
  };
  const getVehicleName = (id) => vehicles.find(v => v.id === id)?.plate || 'N/A';
  const getDriverName = (id) => drivers.find(d => d.id === id)?.name || 'N/A';

  if (loadingUser) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!user) { /* ... Tela de Login ... */ return <div/>; }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header e Navegação ... */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Seção de Alertas */}
            {alerts.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><AlertTriangle className="text-yellow-500 mr-2"/>Alertas Importantes</h3>
                    <ul className="space-y-2">
                        {alerts.map(alert => (
                            <li key={alert.id} className={`flex items-start p-3 rounded-md ${alert.type === 'danger' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                                <AlertTriangle className={`w-5 h-5 mr-3 mt-1 ${alert.type === 'danger' ? 'text-red-500' : 'text-yellow-500'}`} />
                                <span className={`${alert.type === 'danger' ? 'text-red-800' : 'text-yellow-800'}`}>{alert.message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {/* Resto do Dashboard... */}
          </div>
        )}

        {/* Aba Veículos (com campo novo) */}
        {activeTab === 'vehicles' && (
            // Adicione o campo `nextMaintenanceKm` ao formulário de veículos
            // Ex: <input type="number" placeholder="KM Próx. Manutenção" value={vehicleForm.nextMaintenanceKm} ... />
            <div>...</div>
        )}

        {/* Aba Pneus (NOVA) */}
        {activeTab === 'tires' && canAccess(['admin', 'manager']) && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Controle de Pneus</h2>
                {/* Formulário de Pneu */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4">{editingItem ? 'Editar Pneu' : 'Adicionar Pneu'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" placeholder="Marca" value={tireForm.brand} onChange={e => setTireForm({...tireForm, brand: e.target.value})} className="p-2 border rounded" />
                        <input type="text" placeholder="Modelo" value={tireForm.model} onChange={e => setTireForm({...tireForm, model: e.target.value})} className="p-2 border rounded" />
                        <input type="date" value={tireForm.purchaseDate} onChange={e => setTireForm({...tireForm, purchaseDate: e.target.value})} className="p-2 border rounded" />
                        <input type="number" placeholder="Custo (R$)" value={tireForm.cost} onChange={e => setTireForm({...tireForm, cost: Number(e.target.value)})} className="p-2 border rounded" />
                        <select value={tireForm.vehicleId} onChange={e => setTireForm({...tireForm, vehicleId: e.target.value})} className="p-2 border rounded">
                            <option value="">Nenhum veículo (em estoque)</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                        </select>
                        <input type="text" placeholder="Posição (Ex: Dianteiro Esquerdo)" value={tireForm.position} onChange={e => setTireForm({...tireForm, position: e.target.value})} className="p-2 border rounded" />
                        <input type="number" placeholder="KM Inicial do Pneu" value={tireForm.initialKm} onChange={e => setTireForm({...tireForm, initialKm: Number(e.target.value)})} className="p-2 border rounded" />
                        <select value={tireForm.status} onChange={e => setTireForm({...tireForm, status: e.target.value})} className="p-2 border rounded">
                            <option value="Em estoque">Em estoque</option>
                            <option value="Em uso">Em uso</option>
                            <option value="Recapado">Recapado</option>
                            <option value="Descartado">Descartado</option>
                        </select>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={handleSaveTire} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Save className="w-4 h-4" />{editingItem ? 'Atualizar' : 'Salvar'}</button>
                        {editingItem && <button onClick={() => { setEditingItem(null); setTireForm(initialTireForm);}} className="bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"><X className="w-4 h-4" />Cancelar</button>}
                    </div>
                </div>
                {/* Tabela de Pneus */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Pneus da Frota</h3>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-2 text-left">Marca/Modelo</th>
                                <th className="p-2 text-left">Status</th>
                                <th className="p-2 text-left">Veículo Atribuído</th>
                                <th className="p-2 text-left">Posição</th>
                                <th className="p-2 text-left">KM Rodados</th>
                                <th className="p-2 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tires.map(tire => {
                                const vehicle = vehicles.find(v => v.id === tire.vehicleId);
                                const kmRodados = (vehicle && tire.initialKm) ? vehicle.currentKm - tire.initialKm : 0;
                                return (
                                    <tr key={tire.id} className="border-b">
                                        <td className="p-2">{tire.brand} {tire.model}</td>
                                        <td className="p-2">{tire.status}</td>
                                        <td className="p-2">{vehicle ? vehicle.plate : 'Em estoque'}</td>
                                        <td className="p-2">{tire.position}</td>
                                        <td className="p-2">{kmRodados > 0 ? kmRodados.toLocaleString() : 'N/A'} KM</td>
                                        <td className="p-2 flex gap-2">
                                            <button onClick={() => { setEditingItem(tire); setTireForm(tire); }}><Edit className="w-4 h-4 text-blue-600"/></button>
                                            <button onClick={() => handleDelete('tires', tire.id)}><Trash2 className="w-4 h-4 text-red-600"/></button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        {/* Restante das abas (trips, fueling, etc.) com seus JSX completos */}
      </main>
    </div>
  );
};

export default FleetManager;
