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
    if (!user) {
        // Limpa os dados ao fazer logout
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
          // Recarrega os dados dessa coleção específica para refletir a mudança
          const updatedCollection = await db.collection(collectionName).get();
          const stateSetter = {
              vehicles: setVehicles,
              fuelings: setFuelings,
              maintenances: setMaintenances,
              trips: setTrips
          }[collectionName];
          stateSetter(updatedCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
          console.error(`Erro ao salvar em ${collectionName}:`, error);
          alert('Erro ao salvar os dados.');
      } finally {
          setLoadingData(false);
          setEditingItem(null);
          formSetter(initialFormState); // Reseta o formulário
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
    saveData('maintenances', maintenanceForm, editingItem?.id, setMaintenanceForm, { vehicleId: '', date: '', type: '', description: '', cost: 0, km: 0, parts: '', services: '' });
  };
  
  const handleDelete = async (collectionName, id) => {
    if (window.confirm("Tem certeza que deseja apagar este item?")) {
        setLoadingData(true);
        try {
            await db.collection(collectionName).doc(id).delete();
            // Recarrega os dados para refletir a mudança
            const updatedCollection = await db.collection(collectionName).get();
            const stateSetter = {
                vehicles: setVehicles,
                fuelings: setFuelings,
                maintenances: setMaintenances,
                trips: setTrips
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
    return vehicle ? `${vehicle.plate} - ${vehicle.model}` : '
