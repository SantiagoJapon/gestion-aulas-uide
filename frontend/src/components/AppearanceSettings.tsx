import { useState, useEffect } from 'react';

const ACCENT_COLORS = [
    { name: 'Azul', value: 'bg-primary', colorCode: '#3c83f6' },
    { name: 'Púrpura', value: 'bg-purple-500', colorCode: '#a855f7' },
    { name: 'Rosa', value: 'bg-pink-500', colorCode: '#ec4899' },
    { name: 'Rojo', value: 'bg-red-500', colorCode: '#ef4444' },
    { name: 'Naranja', value: 'bg-orange-500', colorCode: '#f97316' },
    { name: 'Amarillo', value: 'bg-yellow-500', colorCode: '#eab308' },
    { name: 'Verde', value: 'bg-green-500', colorCode: '#22c55e' },
    { name: 'Grafito', value: 'bg-gray-500', colorCode: '#6b7280' },
];

export default function AppearanceSettings() {
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
    const [accentColor, setAccentColor] = useState('bg-primary');
    const [sidebarSize, setSidebarSize] = useState('Mediano');
    const [textSize, setTextSize] = useState(3);
    const [showScrollbars, setShowScrollbars] = useState(true);

    // Initialize theme from localStorage or system preference
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            applyTheme(savedTheme);
        } else {
            setTheme('system');
            applyTheme('system');
        }
    }, []);

    const applyTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
        const root = window.document.documentElement;
        const isDark = selectedTheme === 'dark' ||
            (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
        }

        // Save to local storage
        if (selectedTheme === 'system') {
            localStorage.removeItem('theme');
        } else {
            localStorage.setItem('theme', selectedTheme);
        }
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    return (
        <div className="flex h-full min-h-[calc(100vh-4rem)]">
            {/* Inner Sidebar (Settings Navigation) */}
            <aside className="w-64 border-r border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-slate-900/50 p-4 hidden lg:flex flex-col gap-1">
                <div className="mb-4 px-3">
                    <h1 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ajustes del Sistema</h1>
                </div>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left">
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                    <span className="text-sm font-medium">General</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-uide-blue/10 text-uide-blue font-semibold text-left">
                    <span className="material-symbols-outlined text-[20px] fill-1">palette</span>
                    <span className="text-sm">Apariencia</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left">
                    <span className="material-symbols-outlined text-[20px]">accessibility</span>
                    <span className="text-sm font-medium">Accesibilidad</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left">
                    <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                    <span className="text-sm font-medium">Notificaciones</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left">
                    <span className="material-symbols-outlined text-[20px]">security</span>
                    <span className="text-sm font-medium">Privacidad y Seguridad</span>
                </button>

                <div className="mt-auto px-1 py-4">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 mb-1">UIDE Cloud</p>
                        <p className="text-[10px] text-slate-400">Versión 4.2.0 (macOS Edition)</p>
                    </div>
                </div>
            </aside>

            {/* Main Settings Content */}
            <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 lg:rounded-tl-xl shadow-inner scroll-smooth">
                <div className="max-w-4xl mx-auto p-8">
                    {/* Page Heading */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Apariencia</h2>
                        <p className="text-slate-500 mt-2">Personaliza cómo se ve y se siente la aplicación en tu dispositivo.</p>
                    </div>

                    {/* Visual Mode Grid */}
                    <div className="mb-10">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Modo Visual</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* Light Mode */}
                            <div
                                onClick={() => handleThemeChange('light')}
                                className="flex flex-col gap-3 group cursor-pointer"
                            >
                                <div className={`relative aspect-[16/10] rounded-xl border-4 ${theme === 'light' ? 'border-uide-blue' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'} bg-white shadow-md overflow-hidden p-2 flex flex-col gap-1 transition-all hover:-translate-y-1`}>
                                    <div className="h-2 w-full bg-slate-100 rounded-sm"></div>
                                    <div className="flex gap-1 flex-1">
                                        <div className="w-1/3 bg-slate-50 rounded-sm border border-slate-100"></div>
                                        <div className="flex-1 bg-white rounded-sm border border-slate-100 shadow-sm p-1">
                                            <div className="h-1 w-1/2 bg-slate-200 rounded-full mb-1"></div>
                                            <div className="h-1 w-3/4 bg-slate-100 rounded-full"></div>
                                        </div>
                                    </div>
                                    {theme === 'light' && (
                                        <div className="absolute bottom-2 right-2 size-5 bg-uide-blue rounded-full flex items-center justify-center animate-scale-in">
                                            <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-center text-sm font-semibold ${theme === 'light' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Claro</p>
                            </div>

                            {/* Dark Mode */}
                            <div
                                onClick={() => handleThemeChange('dark')}
                                className="flex flex-col gap-3 group cursor-pointer"
                            >
                                <div className={`relative aspect-[16/10] rounded-xl border-4 ${theme === 'dark' ? 'border-uide-blue' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'} bg-[#1e1e1e] shadow-md overflow-hidden p-2 flex flex-col gap-1 transition-all hover:-translate-y-1`}>
                                    <div className="h-2 w-full bg-[#2d2d2d] rounded-sm"></div>
                                    <div className="flex gap-1 flex-1">
                                        <div className="w-1/3 bg-[#252525] rounded-sm border border-[#333]"></div>
                                        <div className="flex-1 bg-[#1e1e1e] rounded-sm border border-[#333] shadow-sm p-1">
                                            <div className="h-1 w-1/2 bg-[#3d3d3d] rounded-full mb-1"></div>
                                            <div className="h-1 w-3/4 bg-[#2d2d2d] rounded-full"></div>
                                        </div>
                                    </div>
                                    {theme === 'dark' && (
                                        <div className="absolute bottom-2 right-2 size-5 bg-uide-blue rounded-full flex items-center justify-center animate-scale-in">
                                            <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-center text-sm font-semibold ${theme === 'dark' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Oscuro</p>
                            </div>

                            {/* Auto Mode */}
                            <div
                                onClick={() => handleThemeChange('system')}
                                className="flex flex-col gap-3 group cursor-pointer"
                            >
                                <div className={`relative aspect-[16/10] rounded-xl border-4 ${theme === 'system' ? 'border-uide-blue' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'} bg-white shadow-md overflow-hidden flex transition-all hover:-translate-y-1`}>
                                    <div className="flex-1 bg-white p-2 flex flex-col gap-1">
                                        <div className="h-2 w-full bg-slate-100 rounded-sm"></div>
                                        <div className="h-1 w-3/4 bg-slate-50 rounded-full"></div>
                                    </div>
                                    <div className="flex-1 bg-[#1e1e1e] p-2 flex flex-col gap-1">
                                        <div className="h-2 w-full bg-[#2d2d2d] rounded-sm"></div>
                                        <div className="h-1 w-3/4 bg-[#3d3d3d] rounded-full"></div>
                                    </div>
                                    {theme === 'system' && (
                                        <div className="absolute bottom-2 right-2 size-5 bg-uide-blue rounded-full flex items-center justify-center animate-scale-in">
                                            <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-center text-sm font-semibold ${theme === 'system' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Automático</p>
                            </div>
                        </div>
                    </div>

                    {/* Settings Controls List */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">

                        {/* Accent Color */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Color de acento</span>
                            <div className="flex gap-2">
                                {ACCENT_COLORS.map((color) => (
                                    <div
                                        key={color.name}
                                        title={color.name}
                                        onClick={() => setAccentColor(color.value)}
                                        className={`size-[18px] rounded-full cursor-pointer transition-transform hover:scale-110 ${color.value} ${accentColor === color.value ? 'ring-2 ring-offset-2 ring-uide-blue dark:ring-offset-slate-900' : ''}`}
                                    ></div>
                                ))}
                            </div>
                        </div>

                        {/* Highlight Color */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Color de realce</span>
                            <select className="bg-slate-100 dark:bg-slate-800 border-none text-sm rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-uide-blue min-w-[140px] text-slate-700 dark:text-slate-200">
                                <option>Color de acento</option>
                                <option>Multicolor</option>
                                <option>Gris</option>
                            </select>
                        </div>

                        {/* Icon Size */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Tamaño de iconos de barra lateral</span>
                            <select
                                value={sidebarSize}
                                onChange={(e) => setSidebarSize(e.target.value)}
                                className="bg-slate-100 dark:bg-slate-800 border-none text-sm rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-uide-blue min-w-[140px] text-slate-700 dark:text-slate-200"
                            >
                                <option>Pequeño</option>
                                <option>Mediano</option>
                                <option>Grande</option>
                            </select>
                        </div>

                        {/* Text Size */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Tamaño de texto</span>
                            <div className="flex items-center gap-3 w-48">
                                <span className="text-xs text-slate-400 font-bold">A</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={textSize}
                                    onChange={(e) => setTextSize(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-uide-blue"
                                />
                                <span className="text-lg text-slate-400 font-bold">A</span>
                            </div>
                        </div>

                        {/* Scrollbars */}
                        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Mostrar siempre barras de desplazamiento</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showScrollbars}
                                    onChange={(e) => setShowScrollbars(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-uide-blue"></div>
                            </label>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors">
                            Cancelar
                        </button>
                        <button className="px-5 py-2 text-sm font-bold text-white bg-uide-blue rounded-lg shadow-sm hover:brightness-110 transition-all">
                            Guardar Cambios
                        </button>
                    </div>

                    {/* Info Card */}
                    <div className="mt-12 p-6 rounded-xl bg-uide-blue/5 border border-uide-blue/10">
                        <div className="flex gap-4">
                            <span className="material-symbols-outlined text-uide-blue">info</span>
                            <div>
                                <h4 className="text-sm font-bold text-uide-blue mb-1">Personalización de Institución</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Estos ajustes solo afectarán tu vista personal del panel de administración. Para cambiar el tema institucional (colores de la marca UIDE) para todos los usuarios, por favor contacta al administrador del sistema.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
