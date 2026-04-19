import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useUIStore from '../store/uiStore';

export default function Layout({ children }) {
    const { sidebarOpen, toggleSidebar } = useUIStore();

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay show-mobile" 
                    onClick={toggleSidebar}
                    style={{ zIndex: 998 }}
                />
            )}
            
            <Sidebar />
            
            <main className="main-content" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <Navbar />
                <div className="content-container animate-fade-in" style={{ 
                    padding: '1.5rem var(--page-px, 2rem) 2rem',
                    maxWidth: '1600px',
                    margin: '0 auto'
                }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
