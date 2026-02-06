
import React, { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Phone,
    Lock,
    Camera,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Shield
} from 'lucide-react';
import { auth, db } from '../firebase';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface ProfileViewProps {
    onBack?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone: '',
        photoURL: '',
        role: ''
    });

    // Listen for real-time updates
    useEffect(() => {
        if (!auth.currentUser) return;
        setLoading(true);

        const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(prev => ({
                    ...prev,
                    name: data.name || auth.currentUser?.displayName || '',
                    email: data.email || auth.currentUser?.email || '',
                    phone: data.phone || '',
                    photoURL: data.photoURL || auth.currentUser?.photoURL || '',
                    role: data.role || 'Usuário'
                }));
            }
            setLoading(false);
        }, (error) => {
            console.error("Erro no listener do perfil:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setSaving(true);
        setMessage(null);

        try {
            await updateProfile(auth.currentUser, {
                displayName: userData.name,
                photoURL: userData.photoURL
            });

            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                name: userData.name,
                phone: userData.phone,
                photoURL: userData.photoURL,
                updatedAt: serverTimestamp()
            });

            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Erro ao salvar alterações: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!auth.currentUser?.email) return;
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, auth.currentUser.email);
            setMessage({ type: 'success', text: 'E-mail de redefinição de senha enviado!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Erro ao solicitar redefinição: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !auth.currentUser) return;

        setSaving(true);
        setMessage(null); // Clear previous messages

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (readerEvent) => {
                const img = new Image();
                img.src = readerEvent.target?.result as string;
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500;
                    const MAX_HEIGHT = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

                    const uploadResp = await fetch('/api/upload-r2', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileName: `profile_${auth.currentUser?.uid}_${Date.now()}.jpg`,
                            fileType: 'image/jpeg',
                            fileData: compressedBase64
                        })
                    });

                    const uploadResult = await uploadResp.json();
                    if (uploadResult.status === 'success') {
                        const newPhotoUrl = uploadResult.url;

                        // SAVE IMMEDIATELY
                        if (auth.currentUser) {
                            await updateProfile(auth.currentUser, { photoURL: newPhotoUrl });
                            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                                photoURL: newPhotoUrl,
                                updatedAt: serverTimestamp()
                            });
                        }

                        // Update localStorage so ChatWindow picks it up immediately
                        localStorage.setItem('userAvatar', newPhotoUrl);

                        // Update local state (redundant with onSnapshot but good for latency masking)
                        setUserData(prev => ({ ...prev, photoURL: newPhotoUrl }));
                        setMessage({ type: 'success', text: 'Foto de perfil atualizada!' });
                    } else {
                        throw new Error("Erro no upload");
                    }
                };
            };
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Erro no upload da foto: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[#f8fafc] overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto p-8 md:p-12 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-gray-800 border border-transparent hover:border-gray-100"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Meu Perfil</h1>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-0.5">Gerencie suas informações</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Photo Side */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-6">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full border-4 border-blue-50 overflow-hidden shadow-xl">
                                    <img
                                        src={userData.photoURL || `https://ui-avatars.com/api/?name=${userData.name}&background=0D8ABC&color=fff`}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <label className="absolute bottom-0 right-0 p-2.5 bg-blue-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition-all hover:scale-110">
                                    <Camera size={18} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                </label>
                            </div>

                            <div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{userData.name}</h3>
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                        {userData.role}
                                    </span>
                                </div>
                            </div>

                            <div className="w-full pt-4 border-t border-gray-50 flex flex-col gap-3">
                                <button
                                    onClick={handlePasswordReset}
                                    className="w-full py-3 bg-gray-50 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <Lock size={14} />
                                    Alterar Senha
                                </button>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-8 text-white shadow-xl">
                            <Shield className="w-10 h-10 mb-4 opacity-50" />
                            <h4 className="text-lg font-black uppercase tracking-tight">Segurança</h4>
                            <p className="text-blue-100/70 text-sm font-medium mt-2 leading-relaxed">
                                Suas informações estão protegidas por criptografia de ponta a ponta e autenticação segura.
                            </p>
                        </div>
                    </div>

                    {/* Info Side */}
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSave} className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nome de Exibição</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-gray-800 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all"
                                            value={userData.name}
                                            onChange={e => setUserData({ ...userData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Telefone WhatsApp</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder="5511999999999"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-gray-800 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all"
                                            value={userData.phone}
                                            onChange={e => setUserData({ ...userData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-2 opacity-60">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">E-mail de Login (Não editável)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            className="w-full bg-gray-100 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-gray-400 outline-none cursor-not-allowed"
                                            value={userData.email}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>

                            {message && (
                                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                                    }`}>
                                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <p className="text-xs font-bold uppercase tracking-tight">{message.text}</p>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
