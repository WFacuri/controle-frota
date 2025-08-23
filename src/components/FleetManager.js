/* global firebase */

// Forçando a atualização para a Vercel - v3
import React, { useState, useEffect } from 'react';
import { Truck, Fuel, Wrench, MapPin, BarChart3, Edit, Trash2, Save, X, LogOut, User, Lock } from 'lucide-react';

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
  // Sistema de autenticação
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  
  // Estados principais
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vehicles, setVehicles] = useState([]);
  const [fuelings, setFuelings] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [trips, setTrips] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  // Formulários
  const [vehicleForm, setVehicleForm] = useState({
    plate: '', model: '', year: '', type: 'Caminhão Truck', currentKm: 0
  });
  const [fuelingForm, setFuelingForm] = useState({
    vehicleId: '', date: '', km: 0, liters: 0, unitPrice: 0
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    vehicleId: '', date: '', type: '', description: '', cost: 0, km: 0, parts: '', services: ''
  });
  const [tripForm, setTripForm] = useState({
    vehicleId: '', date: '', origin: '', destination: '', purpose: 'Aquisição', 
    initialKm: 0, finalKm: 0, fuelPrice: 0, otherCosts: 0
  });

  // Escuta as mudanças de login (mantém o usuário logado)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Pega informações adicionais do usuário do Firestore
        const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
        if (userDoc.exists) {
            setUser({ ...firebaseUser, ...userDoc.data() });
        } else {
            setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  // Carrega os dados do Firestore quando o usuário loga
  useEffect(() => {
    const loadData = async () => {
      if (!user) return; // Não carrega nada se não houver usuário

      setLoadingData(true);
      try {
        const collections = ['vehicles', 'fuelings', 'maintenances', 'trips'];
        const [vehiclesData, fuelingsData, maintenancesData, tripsData] = await Promise.all(
          collections.map(col => db.collection(col).get())
        );

        setVehicles(vehiclesData.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setFuelings(fuelingsData.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setMaintenances(maintenancesData.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTrips(tripsData.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
        alert("Não foi possível carregar os dados.");
      }
      setLoadingData(false);
    };

    loadData();
  }, [user]);

  // Login com Firebase
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await auth.signInWithEmailAndPassword(loginForm.email, loginForm.password);
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Erro no login:", error);
      alert('Email ou senha incorretos!');
    }
  };

  // Logout com Firebase
  const handleLogout = async () => {
    await auth.signOut();
    setLoginForm({ email: '', password: '' });
  };
  
  // Funções CRUD com Firebase
  const saveData = async (collectionName, data, id) => {
      setLoadingData(true);
      try {
          if (id) {
              await db.collection(collectionName).doc(id).update(data);
          } else {
              await db.collection(collectionName).add(data);
          }
          // Recarrega os dados dessa coleção específica para refletir a mudança
          const updatedCollection = await db.collection(collectionName).get();
          const setter = {
              vehicles: setVehicles,
              fuelings: setFuelings,
              maintenances: setMaintenances,
              trips: setTrips
          }[collectionName];
          setter(updatedCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
          console.error(`Erro ao salvar em ${collectionName}:`, error);
          alert('Erro ao salvar os dados.');
      } finally {
          setLoadingData(false);
          setEditingItem(null);
      }
  };

  const handleSaveVehicle = () => {
    if (!canAccess(['admin', 'manager'])) return;
    saveData('vehicles', vehicleForm, editingItem?.id);
    setVehicleForm({ plate: '', model: '', year: '', type: 'Caminhão Truck', currentKm: 0 });
  };
  
  const handleSaveFueling = () => {
    const totalCost = fuelingForm.liters * fuelingForm.unitPrice;
    const fuelingData = { ...fuelingForm, cost: totalCost, driverId: user.uid };
    saveData('fuelings', fuelingData, editingItem?.id);
    setFuelingForm({ vehicleId: '', date: '', km: 0, liters: 0, unitPrice: 0 });
  };

  const handleSaveTrip = () => {
    const kmTraveled = tripForm.finalKm - tripForm.initialKm;
    const fuelCost = kmTraveled > 0 && tripForm.fuelPrice > 0 ? (kmTraveled * tripForm.fuelPrice) : 0;
    const tripData = { ...tripForm, fuelCost: fuelCost, driverId: user.uid };
    saveData('trips', tripData, editingItem?.id);
    setTripForm({ vehicleId: '', date: '', origin: '', destination: '', purpose: 'Aquisição', initialKm: 0, finalKm: 0, fuelPrice: 0, otherCosts: 0 });
  };

  const handleSaveMaintenance = () => {
    if (!canAccess(['admin', 'manager'])) return;
    saveData('maintenances', maintenanceForm, editingItem?.id);
    setMaintenanceForm({ vehicleId: '', date: '', type: '', description: '', cost: 0, km: 0, parts: '', services: '' });
  };
  
  const handleDelete = async (collectionName, id) => {
    if (window.confirm("Tem certeza que deseja apagar este item?")) {
        setLoadingData(true);
        try {
            await db.collection(collectionName).doc(id).delete();
            // Recarrega os dados para refletir a mudança
            const updatedCollection = await db.collection(collectionName).get();
            const setter = {
                vehicles: setVehicles,
                fuelings: setFuelings,
                maintenances: setMaintenances,
                trips: setTrips
            }[collectionName];
            setter(updatedCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error(`Erro ao apagar de ${collectionName}:`, error);
            alert('Erro ao apagar o item.');
        } finally {
            setLoadingData(false);
        }
    }
  };

  // Funções Auxiliares (sem alterações, mas mantidas)
  const canAccess = (requiredRoles) => {
    if (!user || !user.role) return false;
    return requiredRoles.includes(user.role);
  };

  const getAvailableTabs = () => {
    const allTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'manager', 'driver'] },
      { id: 'vehicles', label: 'Veículos', icon: Truck, roles: ['admin', 'manager'] },
      { id: 'trips', label: 'Viagens', icon: MapPin, roles: ['admin', 'manager', 'driver'] },
      { id: 'fueling', label: 'Abastecimento', icon: Fuel, roles: ['admin', 'manager', 'driver'] },
      { id: 'maintenance', label: 'Manutenção', icon: Wrench, roles: ['admin', 'manager'] }
    ];
    return allTabs.filter(tab => canAccess(tab.roles));
  };

  const getVehicleName = (id) => {
    const vehicle = vehicles.find(v => v.id === id);
    return vehicle ? `${vehicle.plate} - ${vehicle.model}` : 'Veículo não encontrado';
  };
  
  // Funções de cálculo (sem grandes alterações)
  const calculateKmPerLiter = (vehicleId) => {
    const vehicleFuelings = fuelings.filter(f => f.vehicleId === vehicleId);
    if (vehicleFuelings.length < 2) return 0;
    
    const sortedFuelings = [...vehicleFuelings].sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalKm = 0;
    let totalLiters = 0;
    
    for (let i = 1; i < sortedFuelings.length; i++) {
      const kmDiff = sortedFuelings[i].km - sortedFuelings[i-1].km;
      if (kmDiff > 0) {
        totalKm += kmDiff;
        totalLiters += sortedFuelings[i-1].liters;
      }
    }
    
    return totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : 0;
  };

  const calculateCostPerKm = (vehicleId) => {
    const vehicleTrips = trips.filter(t => t.vehicleId === vehicleId);
    const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicleId);
    
    let totalKm = vehicleTrips.reduce((sum, trip) => sum + (trip.finalKm - trip.initialKm), 0);
    let totalCosts = vehicleTrips.reduce((sum, trip) => sum + trip.fuelCost + trip.otherCosts, 0);
    totalCosts += vehicleMaintenances.reduce((sum, maintenance) => sum + maintenance.cost, 0);
    
    return totalKm > 0 ? (totalCosts / totalKm).toFixed(2) : 0;
  };

  // Tela de Carregamento inicial
  if (loadingUser) {
      return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Carregando...</div>
  }

  // Tela de Login
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">Login - Controle de Frota</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label>Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label>Senha</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
              Entrar
            </button>
          </form>
           <div className="mt-8 p-4 bg-gray-50 rounded-lg">
             <p className="text-sm text-gray-600 mb-2">Usuários de teste (vá no Firebase > Authentication para criá-los):</p>
             <div className="space-y-1 text-xs">
               <div><strong>Admin:</strong> admin@test.com / senha123</div>
               <div><strong>Gerente:</strong> gerente@test.com / senha123</div>
               <div><strong>Motorista:</strong> motorista@test.com / senha123</div>
             </div>
           </div>
        </div>
      </div>
    );
  }

  // Componente Principal
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Controle de Frota</h1>
          <div>
            <span>Bem-vindo, {user.name || user.email}! ({user.role})</span>
            <button onClick={handleLogout} className="ml-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
              <LogOut className="inline w-4 h-4 mr-1" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8">
            {getAvailableTabs().map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingData && <div className="text-center">Carregando dados...</div>}
        
        {/* Renderiza o conteúdo da aba ativa */}

        {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cards de Resumo */}
            </div>
        )}

        {activeTab === 'vehicles' && canAccess(['admin', 'manager']) && (
            <div className="space-y-6">
                {/* Formulário de Veículos */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">{editingItem ? 'Editar Veículo' : 'Adicionar Veículo'}</h2>
                    {/* Campos do formulário... */}
                     <button onClick={handleSaveVehicle} className="bg-blue-500 text-white px-4 py-2 rounded">Salvar</button>
                     {editingItem && <button onClick={() => setEditingItem(null)} className="ml-2 bg-gray-500 text-white px-4 py-2 rounded">Cancelar</button>}
                </div>
                {/* Tabela de Veículos */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Veículos Cadastrados</h3>
                    <table className="w-full">
                        {/* Cabeçalho da Tabela */}
                        <tbody>
                            {vehicles.map(v => (
                                <tr key={v.id}>
                                    <td>{v.plate}</td>
                                    <td>{v.model}</td>
                                    {/* Mais colunas... */}
                                    <td>
                                        <button onClick={() => { setEditingItem(v); setVehicleForm(v); }}><Edit className="w-4 h-4 text-blue-600"/></button>
                                        <button onClick={() => handleDelete('vehicles', v.id)}><Trash2 className="w-4 h-4 text-red-600 ml-2"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        {/* Adicione aqui as seções para 'trips', 'fueling' e 'maintenance' de forma similar */}

      </main>
    </div>
  );
};

export default FleetManager;
