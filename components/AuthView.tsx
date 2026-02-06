
import React, { useState } from 'react';
import {
    Mail,
    Lock,
    User,
    MessageSquare,
    ArrowRight,
    Eye,
    EyeOff,
    Loader2,
    Sparkles,
    ChevronLeft
} from 'lucide-react';
import { auth, db } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';

interface AuthViewProps {
    initialMode?: 'login' | 'register';
    onBack: () => void;
    onSuccess: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ initialMode = 'login', onBack, onSuccess }) => {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const logLoginAudit = async (user: any) => {
        try {
            await addDoc(collection(db, "login_audits"), {
                userId: user.uid,
                userName: user.displayName || user.name || 'Usuário',
                userEmail: user.email,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                action: 'LOGIN_SUCCESS'
            });
        } catch (err) {
            console.error("Erro ao registrar auditoria:", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'login') {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                await logLoginAudit(userCredential.user);
                onSuccess();
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await updateProfile(user, { displayName: name });

                const isMaster = email.toLowerCase() === 'darlanconradofgv@gmail.com' || email.toLowerCase() === 'admin@comversa.online';

                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    name: name,
                    email: email,
                    role: isMaster ? 'master' : 'user',
                    createdAt: serverTimestamp(),
                    status: isMaster ? 'active' : 'pending',
                    approved: isMaster ? true : false
                });

                onSuccess();
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('E-mail ou senha incorretos.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está em uso.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else {
                setError('Parece que algo deu errado. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0c10] flex overflow-hidden font-sans text-white">
            {/* Dark Visual Side */}
            <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-[#001540] via-[#003399] to-[#001540] items-center justify-center p-20 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-indigo-500/10 blur-[150px] rounded-full" />

                <div className="relative z-10 space-y-12 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/90">
                        <Sparkles size={16} fill="white" className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">ComVersa Enterprise</span>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-6xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                            A Nova Era <br /> do <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">Atendimento.</span>
                        </h2>
                        <p className="text-lg text-blue-100/60 font-medium leading-relaxed">
                            Potencialize suas conversas com Inteligência Artificial e automação de elite em uma única plataforma integrada e extremamente veloz.
                        </p>
                    </div>

                    <div className="pt-10 grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <p className="text-3xl font-black text-white">99.9%</p>
                            <p className="text-[10px] uppercase font-bold text-blue-200/40 tracking-[0.3em]">Uptime</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-3xl font-black text-white">2.5s</p>
                            <p className="text-[10px] uppercase font-bold text-blue-200/40 tracking-[0.3em]">Latência</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-20 bg-[#0a0c10] relative">
                <button
                    onClick={onBack}
                    className="absolute top-10 left-10 flex items-center gap-2 text-gray-500 hover:text-white transition-colors group"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Início</span>
                </button>

                <div className="w-full max-w-md space-y-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-[#003399] rounded-2xl shadow-xl shadow-blue-500/20">
                                <MessageSquare size={24} className="text-white" />
                            </div>
                            <span className="text-xl font-black uppercase tracking-tighter text-white">ComVersa</span>
                        </div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                            {mode === 'login' ? 'Entrar' : 'Registrar'}
                        </h1>
                        <p className="text-gray-500 font-medium">
                            {mode === 'login'
                                ? 'Gerencie seus leads e agendamentos agora.'
                                : 'Comece a escalar sua operação hoje mesmo.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'register' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome Completo</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Darlan Conrado"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all placeholder:text-gray-700"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">E-mail</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    placeholder="seu@email.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all placeholder:text-gray-700"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Senha</label>
                                {mode === 'login' && (
                                    <button type="button" className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors">Esqueceu?</button>
                                )}
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all placeholder:text-gray-700"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold animate-in shake duration-500">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Acessar ComVersa' : 'Começar Agora'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-4">
                        <p className="text-sm font-medium text-gray-500">
                            {mode === 'login' ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
                            <button
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                className="ml-2 text-white font-black hover:text-blue-400 transition-colors outline-none uppercase text-xs tracking-widest"
                            >
                                {mode === 'login' ? 'Registre-se' : 'Faça login'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-in { animation-duration: 0.5s; }
      `}</style>
        </div>
    );
};

export default AuthView;
