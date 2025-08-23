import React, { useState, useEffect } from 'react';
import { Truck, Fuel, Wrench, MapPin, BarChart3, Plus, Edit, Trash2, Save, X, LogOut, User, Lock } from 'lucide-react';

// Configuração do Firebase (substitua pelas suas credenciais)
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "sua-app-id"
};

// Simulação das funções do Firebase (para funcionar sem configuração real)
const mockFirebase = {
  collection: (name) => ({
    doc: (id) => ({
      set: (data) => Promise.resolve(),
      update: (data) => Promise.resolve(),
      delete: () => Promise.resolve(),
      get: () => Promise.resolve({ exists: true, data: () => ({}) }),
    }),
    add: (data) => Promise.resolve({ id: Date.now().toString() }),
    get: () => Promise.resolve({
      docs: []
    }),
    where: () => ({
      get: () => Promise.resolve({ docs: [] })
    })
  })
};

const FleetManager = () => {
  // Sistema de autenticação
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Usuários de exemplo (em produção, viria do backend)
  const users = [
    { id: 1, username: 'admin', password: 'admin123', name: 'João Silva', role: 'admin' },
    { id: 2, username: 'gerente', password: 'gerente123', name: 'Maria Santos', role: 'manager' },
    { id: 3, username: 'motorista', password: 'motorista123', name: 'Carlos Oliveira', role: 'driver' }
  ];

  // Estados para controle de loading
  const [loading, setLoading] = useState(false);

  // Função para salvar no Firebase
  const saveToFirebase = async (collection, data, id = null) => {
    setLoading(true);
    try {
      if (id) {
        await mockFirebase.collection(collection).doc(id).update(data);
      } else {
        const docRef = await mockFirebase.collection(collection).add(data);
        return docRef.id;
      }
    } catch (error) {
      console.error(`Erro ao salvar ${collection}:`, error);
      alert(`Erro ao salvar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar do Firebase
  const loadFromFirebase = async (collection, filters = null) => {
    setLoading(true);
    try {
      let query = mockFirebase.collection(collection);

      if (filters) {
        filters.forEach(filter => {
          query = query.where(filter.field, filter.operator, filter.value);
        });
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Erro ao carregar ${collection}:`, error);
      return [];
    } finally {
      setLoading(false);
    }
  };
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vehicles, setVehicles] = useState([]);
  const [fuelings, setFuelings] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [trips, setTrips] = useState([]);
  const [editingItem, setEditingItem] = useState(null);

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

  // Verificar se usuário pode acessar funcionalidade
  const canAccess = (requiredRoles) => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  // Obter abas disponíveis baseado no perfil
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

  // Login
  const handleLogin = (e) => {
    e.preventDefault();
    const foundUser = users.find(u =>
      u.username === loginForm.username && u.password === loginForm.password
    );

    if (foundUser) {
      setUser(foundUser);
      setActiveTab('dashboard');
    } else {
      alert('Usuário ou senha incorretos!');
    }
  };

  // Logout
  const handleLogout = () => {
    setUser(null);
    setLoginForm({ username: '', password: '' });
    setActiveTab('dashboard');
  };

  // Inicialização com dados de exemplo e carregamento do Firebase
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setLoading(true);
        try {
          // Carregar dados do Firebase baseado no perfil do usuário
          const [vehiclesData, fuelingsData, tripsData, maintenancesData] = await Promise.all([
            loadFromFirebase('vehicles'),
            loadFromFirebase('fuelings', user.role === 'driver' ? [{ field: 'driverId', operator: '==', value: user.id }] : null),
            loadFromFirebase('trips', user.role === 'driver' ? [{ field: 'driverId', operator: '==', value: user.id }] : null),
            canAccess(['admin', 'manager']) ? loadFromFirebase('maintenances') : Promise.resolve([])
          ]);

          setVehicles(vehiclesData.length > 0 ? vehiclesData : [
            { id: '1', plate: 'ABC-1234', model: 'Volvo FH', year: 2020, type: 'Caminhão Boiadeiro', currentKm: 125000 },
            { id: '2', plate: 'DEF-5678', model: 'Mercedes Atego', year: 2019, type: 'Caminhão Truck', currentKm: 98000 }
          ]);

          setFuelings(fuelingsData.length > 0 ? fuelingsData : [
            { id: '1', vehicleId: '1', date: '2025-08-15', km: 124800, liters: 180, cost: 1080, driverId: 3 },
            { id: '2', vehicleId: '2', date: '2025-08-16', km: 97850, liters: 120, cost: 720, driverId: 3 }
          ]);

          setTrips(tripsData.length > 0 ? tripsData : [
            { id: '1', vehicleId: '1', date: '2025-08-15', origin: 'Frigorífico A', destination: 'Loja Centro',
              purpose: 'Distribuição', initialKm: 124750, finalKm: 124800, fuelCost: 300, otherCosts: 50, driverId: 3 }
          ]);

          setMaintenances(maintenancesData.length > 0 ? maintenancesData : [
            { id: '1', vehicleId: '1', date: '2025-08-10', type: 'Preventiva', description: 'Troca de óleo',
              cost: 350, km: 124500, parts: 'Filtro de óleo', services: 'Troca de óleo do motor' }
          ]);
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [user]); // Removido canAccess e loadFromFirebase para evitar re-renderizações desnecessárias

  // Funções auxiliares
  const getVehicleName = (id) => {
    const vehicle = vehicles.find(v => v.id === id || v.id === parseInt(id));
    return vehicle ? `${vehicle.plate} - ${vehicle.model}` : 'Veículo não encontrado';
  };

  const getUserName = (id) => {
    const userData = users.find(u => u.id === id || u.id === parseInt(id));
    return userData ? userData.name : 'Usuário não encontrado';
  };

  const calculateKmPerLiter = (vehicleId) => {
    const vehicleFuelings = fuelings.filter(f =>
      f.vehicleId === vehicleId || f.vehicleId === parseInt(vehicleId) || f.vehicleId === vehicleId.toString()
    );
    if (vehicleFuelings.length < 2) return 0;

    const sortedFuelings = vehicleFuelings.sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalKm = 0;
    let totalLiters = 0;

    for (let i = 1; i < sortedFuelings.length; i++) {
      const kmDiff = sortedFuelings[i].km - sortedFuelings[i - 1].km;
      totalKm += kmDiff;
      totalLiters += sortedFuelings[i].liters;
    }

    return totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : 0;
  };

  const calculateCostPerKm = (vehicleId) => {
    const vehicleTrips = trips.filter(t =>
      t.vehicleId === vehicleId || t.vehicleId === parseInt(vehicleId) || t.vehicleId === vehicleId.toString()
    );
    const vehicleMaintenances = maintenances.filter(m =>
      m.vehicleId === vehicleId || m.vehicleId === parseInt(vehicleId) || m.vehicleId === vehicleId.toString()
    );

    let totalKm = vehicleTrips.reduce((sum, trip) => sum + (trip.finalKm - trip.initialKm), 0);
    let totalCosts = vehicleTrips.reduce((sum, trip) => sum + trip.fuelCost + trip.otherCosts, 0);
    totalCosts += vehicleMaintenances.reduce((sum, maintenance) => sum + maintenance.cost, 0);

    return totalKm > 0 ? (totalCosts / totalKm).toFixed(2) : 0;
  };

  // Funções CRUD com Firebase
  const handleSaveVehicle = async () => {
    if (!canAccess(['admin', 'manager'])) return;

    const vehicleData = {
      ...vehicleForm,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    };

    if (editingItem) {
      await saveToFirebase('vehicles', vehicleData, editingItem.id);
      setVehicles(vehicles.map(v => v.id === editingItem.id ?
        { ...vehicleData, id: editingItem.id } : v));
    } else {
      vehicleData.createdAt = new Date().toISOString();
      vehicleData.createdBy = user.id;
      const newId = await saveToFirebase('vehicles', vehicleData);
      setVehicles([...vehicles, { ...vehicleData, id: newId || Date.now().toString() }]);
    }
    setVehicleForm({ plate: '', model: '', year: '', type: 'Caminhão Truck', currentKm: 0 });
    setEditingItem(null);
  };

  const handleSaveFueling = async () => {
    const totalCost = fuelingForm.liters * fuelingForm.unitPrice;
    const fuelingData = {
      ...fuelingForm,
      cost: totalCost,
      vehicleId: fuelingForm.vehicleId,
      driverId: user.role === 'driver' ? user.id : null,
      createdAt: new Date().toISOString(),
      createdBy: user.id
    };

    if (editingItem) {
      await saveToFirebase('fuelings', fuelingData, editingItem.id);
      setFuelings(fuelings.map(f => f.id === editingItem.id ?
        { ...fuelingData, id: editingItem.id } : f));
    } else {
      const newId = await saveToFirebase('fuelings', fuelingData);
      setFuelings([...fuelings, { ...fuelingData, id: newId || Date.now().toString() }]);
    }
    setFuelingForm({ vehicleId: '', date: '', km: 0, liters: 0, unitPrice: 0 });
    setEditingItem(null);
  };

  const handleSaveTrip = async () => {
    const kmTraveled = tripForm.finalKm - tripForm.initialKm;
    const fuelCost = kmTraveled > 0 && tripForm.fuelPrice > 0 ? (kmTraveled * tripForm.fuelPrice) : 0;
    const tripData = {
      ...tripForm,
      fuelCost: fuelCost,
      vehicleId: tripForm.vehicleId,
      driverId: user.role === 'driver' ? user.id : null,
      createdAt: new Date().toISOString(),
      createdBy: user.id
    };

    if (editingItem) {
      await saveToFirebase('trips', tripData, editingItem.id);
      setTrips(trips.map(t => t.id === editingItem.id ?
        { ...tripData, id: editingItem.id } : t));
    } else {
      const newId = await saveToFirebase('trips', tripData);
      setTrips([...trips, { ...tripData, id: newId || Date.now().toString() }]);
    }
    setTripForm({ vehicleId: '', date: '', origin: '', destination: '', purpose: 'Aquisição',
      initialKm: 0, finalKm: 0, fuelPrice: 0, otherCosts: 0 });
    setEditingItem(null);
  };

  const handleSaveMaintenance = async () => {
    if (!canAccess(['admin', 'manager'])) return;

    const maintenanceData = {
      ...maintenanceForm,
      vehicleId: maintenanceForm.vehicleId,
      createdAt: new Date().toISOString(),
      createdBy: user.id
    };

    if (editingItem) {
      await saveToFirebase('maintenances', maintenanceData, editingItem.id);
      setMaintenances(maintenances.map(m => m.id === editingItem.id ?
        { ...maintenanceData, id: editingItem.id } : m));
    } else {
      const newId = await saveToFirebase('maintenances', maintenanceData);
      setMaintenances([...maintenances, { ...maintenanceData, id: newId || Date.now().toString() }]);
    }
    setMaintenanceForm({ vehicleId: '', date: '', type: '', description: '', cost: 0, km: 0, parts: '', services: '' });
    setEditingItem(null);
  };

  // Filtrar dados baseado no perfil do usuário
  const getFilteredData = (data, filterField = 'driverId') => {
    if (user && user.role === 'driver') {
      return data.filter(item => item[filterField] === user.id);
    }
    return data;
  };

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite seu usuário"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite sua senha"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Entrar
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Usuários de teste:</p>
            <div className="space-y-1 text-xs">
              <div><strong>Admin:</strong> admin / admin123</div>
              <div><strong>Gerente:</strong> gerente / gerente123</div>
              <div><strong>Motorista:</strong> motorista / motorista123</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Componente Dashboard
  const Dashboard = () => {
    const displayTrips = getFilteredData(trips, 'driverId');
    const displayFuelings = getFilteredData(fuelings, 'driverId');

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Total de Veículos</h3>
              <p className="text-3xl font-bold text-blue-600">{vehicles.length}</p>
            </div>
            <Truck className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900">
                {user.role === 'driver' ? 'Minhas Viagens' : 'Viagens Realizadas'}
              </h3>
              <p className="text-3xl font-bold text-green-600">{displayTrips.length}</p>
            </div>
            <MapPin className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">
                {user.role === 'driver' ? 'Meus Abastecimentos' : 'Abastecimentos'}
              </h3>
              <p className="text-3xl font-bold text-yellow-600">{displayFuelings.length}</p>
            </div>
            <Fuel className="w-12 h-12 text-yellow-500" />
          </div>
        </div>

        {canAccess(['admin', 'manager']) && (
          <div className="md:col-span-2 lg:col-span-3 bg-white p-6 rounded-lg border">
            <h3 className="text-xl font-normal mb-4 text-gray-400">Indicadores por Veículo</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Veículo</th>
                    <th className="text-left p-2">Km/L</th>
                    <th className="text-left p-2">Custo/Km (R$)</th>
                    <th className="text-left p-2">Km Atual</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(vehicle => (
                    <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-normal text-gray-400">{vehicle.plate} - {vehicle.model}</td>
                      <td className="p-2">{calculateKmPerLiter(vehicle.id)}</td>
                      <td className="p-2">R$ {calculateCostPerKm(vehicle.id)}</td>
                      <td className="p-2">{vehicle.currentKm.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-medium text-gray-400">Sistema de Controle de Frota</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user.name}</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {user.role === 'admin' ? 'Administrador' :
                    user.role === 'manager' ? 'Gerente' : 'Motorista'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {getAvailableTabs().map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard />}

        {/* Veículos - Apenas Admin e Gerente -- SEÇÃO CORRIGIDA */}
        {activeTab === 'vehicles' && canAccess(['admin', 'manager']) && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-xl font-normal mb-4 text-gray-400">
                {editingItem ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placa do Veículo</label>
                  <input
                    type="text"
                    placeholder="Ex: ABC-1234"
                    value={vehicleForm.plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo do Veículo</label>
                  <input
                    type="text"
                    placeholder="Ex: Volvo FH"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano de Fabricação</label>
                  <input
                    type="number"
                    placeholder="Ex: 2020"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Veículo</label>
                  <select
                    value={vehicleForm.type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Caminhão Truck">Caminhão Truck</option>
                    <option value="Caminhão 3/4">Caminhão 3/4</option>
                    <option value="Caminhão Boiadeiro">Caminhão Boiadeiro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quilometragem Atual</label>
                  <input
                    type="number"
                    placeholder="Ex: 125000"
                    value={vehicleForm.currentKm}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, currentKm: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSaveVehicle}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingItem ? 'Atualizar' : 'Salvar'}
                </button>
                {editingItem && (
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setVehicleForm({ plate: '', model: '', year: '', type: 'Caminhão Truck', currentKm: 0 });
                    }}
                    className="flex items-center px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-normal mb-4 text-gray-400">Veículos Cadastrados</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Placa</th>
                      <th className="text-left p-2">Modelo</th>
                      <th className="text-left p-2">Ano</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Km Atual</th>
                      {canAccess(['admin']) && <th className="text-left p-2">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(vehicle => (
                      <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-normal text-gray-400">{vehicle.plate}</td>
                        <td className="p-2">{vehicle.model}</td>
                        <td className="p-2">{vehicle.year}</td>
                        <td className="p-2">{vehicle.type}</td>
                        <td className="p-2">{vehicle.currentKm.toLocaleString()}</td>
                        {canAccess(['admin']) && (
                          <td className="p-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingItem(vehicle);
                                  setVehicleForm(vehicle);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setVehicles(vehicles.filter(v => v.id !== vehicle.id))}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Viagens - Todos os perfis */}
        {activeTab === 'trips' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-xl font-normal mb-4 text-gray-400">Registrar Nova Viagem</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
                  <select
                    value={tripForm.vehicleId}
                    onChange={(e) => setTripForm({ ...tripForm, vehicleId: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Selecionar Veículo</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data da Viagem</label>
                  <input
                    type="date"
                    value={tripForm.date}
                    onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                  <input
                    type="text"
                    placeholder="Local de origem"
                    value={tripForm.origin}
                    onChange={(e) => setTripForm({ ...tripForm, origin: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                  <input
                    type="text"
                    placeholder="Local de destino"
                    value={tripForm.destination}
                    onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Propósito da Viagem</label>
                  <select
                    value={tripForm.purpose}
                    onChange={(e) => setTripForm({...tripForm, purpose: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Aquisição">Aquisição</option>
                    <option value="Distribuição">Distribuição</option>
                    <option value="Varejo">Varejo</option>
                    <option value="Manutenção">Manutenção</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Km Inicial (Saída)</label>
                  <input
                    type="number"
                    placeholder="Ex: 125000"
                    value={tripForm.initialKm}
                    onChange={(e) => setTripForm({...tripForm, initialKm: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Km Final (Chegada)</label>
                  <input
                    type="number"
                    placeholder="Ex: 125150"
                    value={tripForm.finalKm}
                    onChange={(e) => setTripForm({...tripForm, finalKm: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custo Combustível por Km (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 2.35"
                    value={tripForm.fuelPrice}
                    onChange={(e) => setTripForm({...tripForm, fuelPrice: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outros Custos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Pedágios, alimentação, etc."
                    value={tripForm.otherCosts}
                    onChange={(e) => setTripForm({...tripForm, otherCosts: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveTrip}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mt-4"
              >
                <Save className="w-4 h-4 mr-2" />
                Registrar Viagem
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-normal mb-4 text-gray-400">
                {user.role === 'driver' ? 'Minhas Viagens' : 'Viagens Realizadas'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Veículo</th>
                      <th className="text-left p-2">Origem → Destino</th>
                      <th className="text-left p-2">Propósito</th>
                      <th className="text-left p-2">Km Rodados</th>
                      <th className="text-left p-2">Custo Total</th>
                      {canAccess(['admin', 'manager']) && <th className="text-left p-2">Motorista</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredData(trips, 'driverId').map(trip => (
                      <tr key={trip.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{new Date(trip.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-2 font-normal text-gray-400">{getVehicleName(trip.vehicleId)}</td>
                        <td className="p-2">{trip.origin} → {trip.destination}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            trip.purpose === 'Aquisição' ? 'bg-blue-100 text-blue-800' :
                              trip.purpose === 'Distribuição' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                            }`}>
                            {trip.purpose}
                          </span>
                        </td>
                        <td className="p-2">{trip.finalKm - trip.initialKm} km</td>
                        <td className="p-2">R$ {(trip.fuelCost + trip.otherCosts).toFixed(2)}</td>
                        {canAccess(['admin', 'manager']) && (
                          <td className="p-2">{trip.driverId ? getUserName(trip.driverId) : '-'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Abastecimento - Todos os perfis */}
        {activeTab === 'fueling' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-xl font-normal mb-4 text-gray-400">Registrar Abastecimento</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
                  <select
                    value={fuelingForm.vehicleId}
                    onChange={(e) => setFuelingForm({ ...fuelingForm, vehicleId: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Selecionar Veículo</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data do Abastecimento</label>
                  <input
                    type="date"
                    value={fuelingForm.date}
                    onChange={(e) => setFuelingForm({ ...fuelingForm, date: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Km do Veículo no Abastecimento</label>
                  <input
                    type="number"
                    placeholder="Ex: 125000"
                    value={fuelingForm.km}
                    onChange={(e) => setFuelingForm({ ...fuelingForm, km: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Litros</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 180.5"
                    value={fuelingForm.liters}
                    onChange={(e) => setFuelingForm({ ...fuelingForm, liters: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço por Litro (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 6.00"
                    value={fuelingForm.unitPrice}
                    onChange={(e) => setFuelingForm({ ...fuelingForm, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total Calculado (R$)</label>
                  <input
                    type="text"
                    value={`R$ ${(fuelingForm.liters * fuelingForm.unitPrice).toFixed(2)}`}
                    disabled
                    className="w-full p-2 border rounded bg-gray-100"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveFueling}
                className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mt-4"
              >
                <Save className="w-4 h-4 mr-2" />
                Registrar Abastecimento
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-normal mb-4 text-gray-400">
                {user.role === 'driver' ? 'Meus Abastecimentos' : 'Histórico de Abastecimentos'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Veículo</th>
                      <th className="text-left p-2">Km</th>
                      <th className="text-left p-2">Litros</th>
                      <th className="text-left p-2">Valor Total</th>
                      <th className="text-left p-2">Preço/Litro</th>
                      {canAccess(['admin', 'manager']) && <th className="text-left p-2">Motorista</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredData(fuelings, 'driverId').map(fueling => (
                      <tr key={fueling.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{new Date(fueling.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-2 font-normal text-gray-400">{getVehicleName(fueling.vehicleId)}</td>
                        <td className="p-2">{fueling.km.toLocaleString()}</td>
                        <td className="p-2">{fueling.liters}L</td>
                        <td className="p-2">R$ {fueling.cost.toFixed(2)}</td>
                        <td className="p-2">R$ {(fueling.cost / fueling.liters).toFixed(2)}</td>
                        {canAccess(['admin', 'manager']) && (
                          <td className="p-2">{fueling.driverId ? getUserName(fueling.driverId) : '-'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Manutenção - Apenas Admin e Gerente */}
        {activeTab === 'maintenance' && canAccess(['admin', 'manager']) && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-xl font-normal mb-4 text-gray-400">Registrar Manutenção</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
                  <select
                    value={maintenanceForm.vehicleId}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicleId: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Selecionar Veículo</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data da Manutenção</label>
                  <input
                    type="date"
                    value={maintenanceForm.date}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Manutenção</label>
                  <select
                    value={maintenanceForm.type}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Tipo de Manutenção</option>
                    <option value="Preventiva">Preventiva</option>
                    <option value="Corretiva">Corretiva</option>
                    <option value="Pneus">Pneus</option>
                    <option value="Óleo">Troca de Óleo</option>
                    <option value="Freios">Freios</option>
                    <option value="Revisão">Revisão</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Km do Veículo na Manutenção</label>
                  <input
                    type="number"
                    placeholder="Ex: 125000"
                    value={maintenanceForm.km}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, km: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custo Total da Manutenção (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 850.00"
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peças Utilizadas</label>
                  <input
                    type="text"
                    placeholder="Ex: Filtro de óleo, Pastilhas de freio"
                    value={maintenanceForm.parts}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, parts: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serviços Realizados</label>
                  <textarea
                    placeholder="Ex: Troca de óleo do motor, Alinhamento e balanceamento"
                    value={maintenanceForm.services}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, services: e.target.value })}
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações Adicionais</label>
                  <textarea
                    placeholder="Detalhes da manutenção, observações importantes..."
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveMaintenance}
                className="flex items-center px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 mt-4"
              >
                <Save className="w-4 h-4 mr-2" />
                Registrar Manutenção
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-normal mb-4 text-gray-400">Histórico de Manutenções</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Veículo</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Km</th>
                      <th className="text-left p-2">Custo</th>
                      <th className="text-left p-2">Peças</th>
                      <th className="text-left p-2">Serviços</th>
                      <th className="text-left p-2">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenances.map(maintenance => (
                      <tr key={maintenance.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{new Date(maintenance.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-2 font-normal text-gray-400">{getVehicleName(maintenance.vehicleId)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            maintenance.type === 'Preventiva' ? 'bg-green-100 text-green-800' :
                              maintenance.type === 'Corretiva' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {maintenance.type}
                          </span>
                        </td>
                        <td className="p-2">{maintenance.km.toLocaleString()}</td>
                        <td className="p-2">R$ {maintenance.cost.toFixed(2)}</td>
                        <td className="p-2">{maintenance.parts || '-'}</td>
                        <td className="p-2">{maintenance.services || '-'}</td>
                        <td className="p-2">{maintenance.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetManager;
