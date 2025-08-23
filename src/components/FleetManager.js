/* global firebase */

// Versão final e corrigida
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
    vehicleId: '', date: '', type: 'Preventiva', description: '', cost: 0, km: 0, parts: '', services: ''
  });
  const [tripForm, setTripForm] = useState({
    vehicleId: '', date: '', origin: '', destination: '', purpose: 'Aquisição', 
    initialKm: 0, finalKm: 0, fuelPrice: 0, otherCosts: 0
  });

  // Escuta as mudanças de login (mantém o usuário logado)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
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
    if (!user) {
        setVehicles([]);
        setFuelings([]);
        setMaintenances([]);
        setTrips([]);
        return;
    };

    const loadData = async () => {
      setLoadingData(true);
      try {
        const collections = ['vehicles', 'fuelings', 'maintenances', 'trips'];
        const promises = collections.map(col => db.collection(col).where("authorUid", "==", user.uid).get());
        const [vehiclesData, fuelingsData, maintenancesData, tripsData] = await Promise.all(promises);

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
  
  // Função genérica para salvar/atualizar dados
  const saveData = async (collectionName, data, id, formSetter, initialFormState) => {
      setLoadingData(true);
      try {
          const dataToSave = { ...data, updatedAt: new Date().toISOString() };
          if (id) {
              await db.collection(collectionName).doc(id).update(dataToSave);
          } else {
              dataToSave.createdAt = new Date().toISOString();
              dataToSave.authorUid = user.uid;
              await db.collection(collectionName).add(dataToSave);
          }
          // Recarrega os dados dessa coleção
          const updatedCollection = await db.collection(collectionName).where("authorUid", "==", user.uid).get();
          const stateSetter = {
              vehicles: setVehicles, fuelings: setFuelings, maintenances: setMaintenances, trips: setTrips
          }[collectionName];
          stateSetter(updatedCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
          console.error(`Erro ao salvar em ${collectionName}:`, error);
          alert('Erro ao salvar os dados.');
      } finally {
          setLoadingData(false);
          setEditingItem(null);
          formSetter(initialFormState);
      }
  };

  const handleSaveVehicle = () => {
    if (!canAccess(['admin', 'manager'])) return;
    saveData('vehicles', vehicleForm, editingItem?.id, setVehicleForm, { plate: '', model: '', year: '', type: 'Caminhão Truck', currentKm: 0 });
  };
  
  const handleSaveFueling = () => {
    const totalCost = fuelingForm.liters * fuelingForm.unitPrice;
    const fuelingData = { ...fuelingForm, cost: totalCost, driverId: user.uid };
    saveData('fuelings', fuelingData, editingItem?.id, setFuelingForm, { vehicleId: '', date: '', km: 0, liters: 0, unitPrice: 0 });
  };

  const handleSaveTrip = () => {
    const kmTraveled = tripForm.finalKm - tripForm.initialKm;
    if (kmTraveled < 0) {
        alert("A quilometragem final deve ser maior que a inicial.");
        return;
    }
    const fuelCost = kmTraveled > 0 && tripForm.fuelPrice > 0 ? (kmTraveled * tripForm.fuelPrice) : 0;
    const tripData = { ...tripForm, fuelCost: fuelCost, driverId: user.uid };
    saveData('trips', tripData, editingItem?.id, setTripForm, { vehicleId: '', date: '', origin: '', destination: '', purpose: 'Aquisição', initialKm: 0, finalKm: 0, fuelPrice: 0, otherCosts: 0 });
  };

  const handleSaveMaintenance = () => {
    if (!canAccess(['admin', 'manager'])) return;
    saveData('maintenances', maintenanceForm, editingItem?.id, setMaintenanceForm, { vehicleId: '', date: '', type: 'Preventiva', description: '', cost: 0, km: 0, parts: '', services: '' });
  };
  
  const handleDelete = async (collectionName, id) => {
    if (window.confirm("Tem certeza que deseja apagar este item?")) {
        setLoadingData(true);
        try {
            await db.collection(collectionName).doc(id).delete();
            const updatedCollection = await db.collection(collectionName).where("authorUid", "==", user.uid).get();
            const stateSetter = {
                vehicles: setVehicles, fuelings: setFuelings, maintenances: setMaintenances, trips: setTrips
            }[collectionName];
            stateSetter(updatedCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error(`Erro ao apagar de ${collectionName}:`, error);
            alert('Erro ao apagar o item.');
        } finally {
            setLoadingData(false);
        }
    }
  };

  // Funções Auxiliares
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
  
  // Tela de Carregamento inicial
  if (loadingUser) {
      return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-lg">Carregando Sistema...</div>
  }

  // Tela de Login
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
           <div className="text-center mb-8">
             <div className="flex items-center justify-center mb-4">
               <Truck className="w-12 h-12 text-blue-600" />
             </div>
             <h1 className="text-2xl font-bold text-gray-900">Sistema de Controle de Frota</h1>
             <p className="text-gray-600 mt-2">Faça login para continuar</p>
           </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
               <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={loginForm.email} onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
               </div>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
               <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
               </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200">
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
            <button onClick={handleLogout} className="ml-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 flex items-center">
              <LogOut className="inline w-4 h-4 mr-2" />
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
        {loadingData && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">Carregando dados...</div>}
        
        {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700">Total de Veículos</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{vehicles.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700">Total de Viagens</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">{trips.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700">Manutenções Registradas</h3>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{maintenances.length}</p>
                </div>
            </div>
        )}

        {activeTab === 'vehicles' && canAccess(['admin', 'manager']) && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">{editingItem ? 'Editar Veículo' : 'Adicionar Novo Veículo'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                  <input type="text" placeholder="ABC-1234" value={vehicleForm.plate} onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })} className="w-full p-2 border rounded"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input type="text" placeholder="Ex: Volvo FH" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} className="w-full p-2 border rounded"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                  <input type="number" placeholder="2020" value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} className="w-full p-2 border rounded"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={vehicleForm.type} onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })} className="w-full p-2 border rounded">
                    <option value="Caminhão Truck">Caminhão Truck</option>
                    <option value="Caminhão 3/4">Caminhão 3/4</option>
                    <option value="Caminhão Boiadeiro">Caminhão Boiadeiro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Km Atual</label>
                  <input type="number" placeholder="125000" value={vehicleForm.currentKm} onChange={(e) => setVehicleForm({ ...vehicleForm, currentKm: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded"/>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveVehicle} className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  {editingItem ? 'Atualizar' : 'Salvar'}
                </button>
                {editingItem && (
                  <button onClick={() => { setEditingItem(null); setVehicleForm({ plate: '', model: '', year: '', type: 'Caminhão Truck', currentKm: 0 }); }} className="flex items-center px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Veículos Cadastrados</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 font-semibold">Placa</th>
                      <th className="p-2 font-semibold">Modelo</th>
                      <th className="p-2 font-semibold">Ano</th>
                      <th className="p-2 font-semibold">Tipo</th>
                      <th className="p-2 font-semibold">Km Atual</th>
                      <th className="p-2 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{v.plate}</td>
                        <td className="p-2">{v.model}</td>
                        <td className="p-2">{v.year}</td>
                        <td className="p-2">{v.type}</td>
                        <td className="p-2">{v.currentKm ? v.currentKm.toLocaleString() : 0}</td>
                        <td className="p-2 flex gap-2">
                          <button onClick={() => { setEditingItem(v); setVehicleForm(v); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Editar"><Edit className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete('vehicles', v.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Apagar"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default FleetManager;
