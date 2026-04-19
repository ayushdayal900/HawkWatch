import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { User, Lock, Save, ShieldCheck, Mail } from 'lucide-react';

export default function SettingsPage() {
    const { user, updateProfile } = useAuthStore();
    
    const [name, setName] = useState(user?.name || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { setPageTitle } = useUIStore();

    useEffect(() => {
        setPageTitle('Account Settings');
    }, [setPageTitle]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateProfile({ name });
            toast.success('Profile updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (newPassword.length < 8) {
            return toast.error('Password must be at least 8 characters');
        }
        
        setLoading(true);
        try {
            await updateProfile({ currentPassword, newPassword });
            toast.success('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="animate-fade-in" style={{ width: '100%', maxWidth: '800px' }}>

                <div style={{ maxWidth: 800 }}>
                    {/* Public Profile Section */}
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)' }}>
                                <User size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--n-900)' }}>Public Profile</h2>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--n-500)' }}>Update your personal information</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--n-700)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text" 
                                        className="input" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        style={{ height: '3rem', paddingLeft: '3rem' }} 
                                    />
                                    <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                                </div>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--n-700)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="email" 
                                        className="input" 
                                        value={user?.email || ''} 
                                        disabled 
                                        style={{ height: '3rem', paddingLeft: '3rem', background: 'var(--n-50)', color: 'var(--n-500)', cursor: 'not-allowed' }} 
                                    />
                                    <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--n-400)', marginTop: 6, display: 'block' }}>Email address cannot be changed. Contact support if needed.</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '2.75rem', padding: '0 1.5rem' }}>
                                    <Save size={16} style={{ marginRight: 8 }} /> Save Profile
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Security Section */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--n-900)' }}>Security</h2>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--n-500)' }}>Update your password and security keys</p>
                            </div>
                        </div>

                        <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--n-700)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Password</label>
                                <input 
                                    type="password" 
                                    className="input" 
                                    value={currentPassword} 
                                    onChange={e => setCurrentPassword(e.target.value)} 
                                    style={{ height: '3rem' }} 
                                />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--n-700)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
                                    <input 
                                        type="password" 
                                        className="input" 
                                        value={newPassword} 
                                        onChange={e => setNewPassword(e.target.value)} 
                                        style={{ height: '3rem' }} 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--n-700)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
                                    <input 
                                        type="password" 
                                        className="input" 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)} 
                                        style={{ height: '3rem' }} 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="submit" className="btn" disabled={loading || !currentPassword || !newPassword} style={{ height: '2.75rem', padding: '0 1.5rem', background: 'var(--danger)', color: '#fff', border: 'none' }}>
                                    <ShieldCheck size={16} style={{ marginRight: 8 }} /> Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
