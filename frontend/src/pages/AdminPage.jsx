import { useState, useEffect } from 'react';
import { organizationAPI } from '../services/api';
import useUIStore from '../store/uiStore';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { Building2, Plus, Loader2 } from 'lucide-react';

export default function AdminPage() {
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', code: '' });
    const [submitting, setSubmitting] = useState(false);

    const { setPageTitle } = useUIStore();

    useEffect(() => {
        setPageTitle('System Administration');
        fetchOrgs();
    }, [setPageTitle]);

    const fetchOrgs = async () => {
        try {
            const { data } = await organizationAPI.getAll();
            setOrganizations(data.data || []);
        } catch (err) {
            toast.error('Failed to load organizations.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        setSubmitting(true);
        try {
            await organizationAPI.create(form);
            toast.success('Organization created successfully!');
            setForm({ name: '', code: '' });
            fetchOrgs(); // Refresh list
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to create organization';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: '#EFF6FF', padding: '0.75rem', borderRadius: 12, color: '#3B82F6' }}>
                        <Building2 size={28} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, color: '#1E293B', fontSize: '1.5rem', fontWeight: 700 }}>Admin Settings</h1>
                        <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>Manage system organizations and configurations.</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Left Col: Create Org */}
                <div className="card animate-fade-up" style={{ padding: '1.5rem', height: 'max-content' }}>
                    <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: '#0F172A' }}>Create Organization</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                Organization Name
                            </label>
                            <input
                                className="input"
                                type="text"
                                placeholder="e.g. Harvard University"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                Short Code (Optional)
                            </label>
                            <input
                                className="input"
                                type="text"
                                placeholder="e.g. HARV01"
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                            />
                        </div>
                        <button
                            className="btn-primary"
                            type="submit"
                            disabled={submitting || !form.name.trim()}
                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Create Org
                        </button>
                    </form>
                </div>

                {/* Right Col: List Orgs */}
                <div className="card animate-fade-up" style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: '#0F172A' }}>Registered Organizations</h2>
                    {loading ? (
                        <div style={{ color: '#64748B', textAlign: 'center', padding: '2rem' }}>Loading...</div>
                    ) : organizations.length === 0 ? (
                        <div style={{ color: '#94A3B8', textAlign: 'center', padding: '3rem', border: '1px dashed #CBD5E1', borderRadius: 8 }}>
                            No organizations found.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {organizations.map((org) => (
                                <div key={org._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.95rem' }}>{org.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
                                            Code: {org.code || 'None'}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#F0FDF4', color: '#16A34A', borderRadius: 99, border: '1px solid #BBF7D0' }}>
                                        Active
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                </div>
            </div>
        </Layout>
    );
}
