import React, { useState } from 'react';
import {
  User,
  Lock,
  Mail,
  Phone,
  Wrench,
  Shield,
  Bike,
  Store,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { UserRole, UserProfile } from '@motorede/shared';
import { storageService } from '../services/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration Form States
  const [regRole, setRegRole] = useState<UserRole>('rider');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Rider specific registration
  const [bikeBrand, setBikeBrand] = useState('Honda');
  const [bikeModel, setBikeModel] = useState('');
  const [bikeYear, setBikeYear] = useState<number>(new Date().getFullYear());
  const [bikePlate, setBikePlate] = useState('');
  const [bikeKm, setBikeKm] = useState<number>(12000);

  // Workshop specific registration
  const [shopName, setShopName] = useState('');
  const [shopCnpj, setShopCnpj] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopCity, setShopCity] = useState('São Paulo - SP');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    'Mecânica Geral',
    'Troca de Óleo',
  ]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    const res = storageService.login(loginEmail, loginPassword);
    if (res.success && res.user) {
      setSuccessMessage(`Bem-vindo de volta, ${res.user.name}!`);
      setTimeout(() => {
        onLoginSuccess(res.user!);
        if (onClose) onClose();
      }, 400);
    } else {
      setErrorMessage(res.error || 'Credenciais inválidas.');
    }
  };

  const handleQuickDemoLogin = (email: string, pass: string) => {
    setErrorMessage(null);
    setLoginEmail(email);
    setLoginPassword(pass);
    const res = storageService.login(email, pass);
    if (res.success && res.user) {
      setSuccessMessage(`Acessando como ${res.user.name}...`);
      setTimeout(() => {
        onLoginSuccess(res.user!);
        if (onClose) onClose();
      }, 300);
    } else {
      setErrorMessage(res.error || 'Erro no login.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Preencha os campos obrigatórios: Nome, E-mail e Senha.');
      return;
    }

    if (regPassword.length < 3) {
      setErrorMessage('A senha deve conter no mínimo 3 caracteres.');
      return;
    }

    if (regRole === 'rider' && !bikeModel.trim()) {
      setErrorMessage('Por favor, informe o modelo da sua motocicleta.');
      return;
    }

    if (regRole === 'partner_shop' && !shopName.trim()) {
      setErrorMessage('Por favor, informe o nome comercial da oficina.');
      return;
    }

    const res = storageService.register({
      name: regName,
      email: regEmail,
      password: regPassword,
      role: regRole,
      phone: regPhone,
      motorcycleBrand: bikeBrand,
      motorcycleModel: bikeModel,
      motorcycleYear: bikeYear,
      motorcyclePlate: bikePlate,
      motorcycleKm: bikeKm,
      shopName,
      cnpj: shopCnpj,
      address: shopAddress,
      city: shopCity,
      specialties: selectedSpecialties,
    });

    if (res.success && res.user) {
      setSuccessMessage(`Conta criada com sucesso! Bem-vindo, ${res.user.name}.`);
      setTimeout(() => {
        onLoginSuccess(res.user!);
        if (onClose) onClose();
      }, 500);
    } else {
      setErrorMessage(res.error || 'Falha ao cadastrar.');
    }
  };

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const isClosable = Boolean(currentUser && onClose);

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="auth-card-container"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header Bar */}
        <div className="bg-slate-950 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-base shadow shrink-0">
              <span>M</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-100 text-sm sm:text-base leading-tight flex items-center gap-2 truncate">
                MotoRede
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  Acesso
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {currentUser
                  ? `Conectado como: ${currentUser.name}`
                  : 'Identifique-se para acessar suas rotas e dados'}
              </p>
            </div>
          </div>

          {isClosable && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition shrink-0 ml-2"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar com Senha</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cadastrar Conta</span>
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto touch-scroll">
          {activeTab === 'login' ? (
            /* LOGIN TAB */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  E-mail ou Usuário
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="piloto@motorede.com.br"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-amber-950/30"
              >
                <LogIn className="w-4 h-4" />
                <span>Acessar Plataforma</span>
              </button>

              {/* Quick 1-Click Demo Profiles */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Acesso Rápido de Demonstração
                  </span>
                  <span className="text-[10px] text-slate-500">1-Clique</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Demo Piloto */}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('piloto@motorede.com.br', '123')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 text-left transition group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Bike className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-slate-200 group-hover:text-amber-400">
                        Piloto
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Carlos Mendonça</p>
                    <p className="text-[9px] text-slate-500 font-mono">Honda CB 500X</p>
                  </button>

                  {/* Demo Oficina */}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('oficina@motovila.com.br', '123')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 text-left transition group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <Wrench className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-slate-200 group-hover:text-blue-400">
                        Oficina
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">MotoTech Garage</p>
                    <p className="text-[9px] text-slate-500 font-mono">Validação de Cupons</p>
                  </button>

                  {/* Demo Admin */}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin@motorede.com.br', 'admin')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 text-left transition group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-slate-200 group-hover:text-red-400">
                        Admin
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Coordenação</p>
                    <p className="text-[9px] text-slate-500 font-mono">Supervisão Geral</p>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* REGISTER TAB */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Select Role */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tipo de Acesso (Perfil)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('rider')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition ${
                      regRole === 'rider'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span className="text-[11px]">Piloto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('partner_shop')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition ${
                      regRole === 'partner_shop'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span className="text-[11px]">Oficina</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('admin')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition ${
                      regRole === 'admin'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-[11px]">Admin</span>
                  </button>
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder={regRole === 'partner_shop' ? 'Nome do Proprietário' : 'Seu Nome'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    WhatsApp / Celular
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    E-mail de Login *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Criar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 3 caracteres"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Conditional: Rider Motorcycle Fields */}
              {regRole === 'rider' && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                    <Bike className="w-3.5 h-3.5" />
                    <span>Dados da Sua Motocicleta Principal</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Marca</label>
                      <select
                        value={bikeBrand}
                        onChange={(e) => setBikeBrand(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Honda">Honda</option>
                        <option value="Yamaha">Yamaha</option>
                        <option value="BMW">BMW</option>
                        <option value="Kawasaki">Kawasaki</option>
                        <option value="Triumph">Triumph</option>
                        <option value="Suzuki">Suzuki</option>
                        <option value="Royal Enfield">Royal Enfield</option>
                        <option value="Harley-Davidson">Harley-Davidson</option>
                        <option value="Ducati">Ducati</option>
                        <option value="Outra">Outra</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Modelo *</label>
                      <input
                        type="text"
                        required
                        value={bikeModel}
                        onChange={(e) => setBikeModel(e.target.value)}
                        placeholder="Ex: CB 500X / MT-03"
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Placa</label>
                      <input
                        type="text"
                        value={bikePlate}
                        onChange={(e) => setBikePlate(e.target.value)}
                        placeholder="BRA-5X92"
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 uppercase focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Ano</label>
                      <input
                        type="number"
                        value={bikeYear}
                        onChange={(e) => setBikeYear(Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">KM Atual</label>
                      <input
                        type="number"
                        value={bikeKm}
                        onChange={(e) => setBikeKm(Number(e.target.value))}
                        placeholder="Ex: 15400"
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: Partner Shop Fields */}
              {regRole === 'partner_shop' && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                    <Store className="w-3.5 h-3.5" />
                    <span>Dados do Estabelecimento / Oficina</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      Nome Comercial da Oficina *
                    </label>
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Ex: Garage MotoCenter"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">CNPJ</label>
                      <input
                        type="text"
                        value={shopCnpj}
                        onChange={(e) => setShopCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">
                        Cidade e Estado
                      </label>
                      <input
                        type="text"
                        value={shopCity}
                        onChange={(e) => setShopCity(e.target.value)}
                        placeholder="São Paulo - SP"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Especialidades Oferecidas
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Mecânica Geral',
                        'Injeção Eletrônica',
                        'Freios e ABS',
                        'Troca de Óleo',
                        'Pneus & Roda',
                        'Suspensão',
                        'Revisão p/ Viagem',
                      ].map((spec) => {
                        const isSelected = selectedSpecialties.includes(spec);
                        return (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => toggleSpecialty(spec)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                            }`}
                          >
                            {spec}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: Admin Key */}
              {regRole === 'admin' && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-red-400 font-semibold text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Nível de Acesso: Supervisão e Gestão Central</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    O perfil Administrador possui controle sobre homologação de oficinas parceiras,
                    auditoria de emergências SOS e moderação comunitária.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-amber-950/30"
              >
                <UserPlus className="w-4 h-4" />
                <span>Finalizar Cadastro e Entrar</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
