import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Bell, X, Volume2, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface Medicine {
    id: number | string;
    name: string;
    dosage: string;
    time: string;
    frequency: string;
    lastTaken: string | null;
    snoozedUntil: string | null;
}

interface FormData {
    name: string;
    dosage: string;
    time: string;
    frequency: string;
}

export default function MedicineReminder() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        dosage: '',
        time: '',
        frequency: 'daily'
    });
    const [activeAlarm, setActiveAlarm] = useState<Medicine | null>(null);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [showSetupGuide, setShowSetupGuide] = useState<boolean>(true);
    const [showInstallPrompt, setShowInstallPrompt] = useState<boolean>(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [audio] = useState<HTMLAudioElement>(new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZURE9k9v0xnYnBSl+zPLaizsIGGS57OihUhENTaXh8bllHAU2jdXzzn0qBSh6yu7ekkILFFm47OqnWBIKRZ/g8r9vIwYvhM/z1IY3Bxpqvu7mnVYSDEuk4fK8aB4FNYzU89GCLgYneMrs4JZHDBRYtu3tqlsUCkSd3fHEcyYGLYPO89aJOwYabLzv56lZEg1Ipe/yuWccBTOL0vTTgzEHKHfJ7eGURAwVWLjt7axdFQpDnN7yxXUpBi2Cy/PWijsFG2y78OifWBINSKXw8rtoHwU0itH01oU0Byh3yO7hlUYME1e27O2rXRQKQ5zd8sTrXBUKQ5rd8sR2KQYugszz1oo8BRpru+/nm1gSDUik7/K7aCMGNIvR9NaGNQcod8jt4ZVGDBNXtuzuq14UDESc3vLEdigGLIPM89aKOgUaa7vv55tXEw1IpPDyu2kjBTSK0fTVhjUHKHfI7uCVRwwUV7Xt7qxeFgxEnN7yxHYoBi2DzPPWijoFGWq77+eaVxMNR6Tv8rpqJAU0is/01YY1Byh3x+7glkYMFFe37O+sXhYMRJzd8sR3KAYug8vz1oo6BRpqu+/nmVgSDkek7/K6aiQGM4rQ9NWGNQcods3t4ZZGDBNY'));

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
        loadMedicines();

        // PWA install prompt
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstallPrompt(false);
        }

        // Service Worker Registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('Service Worker registration failed:', err);
            });
        }

        // Check every 30 seconds - CRITICAL for real-time reminders
        const interval = setInterval(checkReminders, 30000);

        // Also check immediately on load
        checkReminders();

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    useEffect(() => {
        if (medicines.length > 0) {
            saveMedicines();
            checkReminders();
        }
    }, [medicines]);

    const loadMedicines = async (): Promise<void> => {
        try {
            const value = localStorage.getItem("medicines");

            if (value) {
                setMedicines(JSON.parse(value));
            }
        } catch (error) {
            console.log("No saved medicines found");
        }
    };

    const saveMedicines = async (): Promise<void> => {
        try {
            localStorage.setItem("medicines", JSON.stringify(medicines));
        } catch (error) {
            console.error("Failed to save medicines:", error);
        }
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            setDeferredPrompt(null);
            setShowInstallPrompt(false);
        }
    };

    const requestNotificationPermission = async (): Promise<void> => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
        }
    };

    const testAlarm = (): void => {
        const testMedicine: Medicine = {
            id: 'test',
            name: 'Test Medicine',
            dosage: '1 tablet',
            time: 'now',
            frequency: 'daily',
            lastTaken: null,
            snoozedUntil: null
        };
        triggerAlarm(testMedicine);
    };

    const handleAddMedicine = (): void => {
        if (formData.name && formData.time) {
            const newMedicine: Medicine = {
                id: Date.now(),
                ...formData,
                lastTaken: null,
                snoozedUntil: null
            };
            setMedicines([...medicines, newMedicine]);
            setFormData({ name: '', dosage: '', time: '', frequency: 'daily' });
            setShowForm(false);
        }
    };

    const deleteMedicine = (id: number | string): void => {
        setMedicines(medicines.filter(m => m.id !== id));
    };

    const checkReminders = (): void => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        medicines.forEach(medicine => {
            if (medicine.snoozedUntil && now < new Date(medicine.snoozedUntil)) {
                return;
            }

            const shouldRemind = medicine.time === currentTime;

            if (shouldRemind) {
                const lastTaken = medicine.lastTaken ? new Date(medicine.lastTaken) : null;
                const hoursSinceLastTaken = lastTaken ? (now.getTime() - lastTaken.getTime()) / (1000 * 60 * 60) : Infinity;

                if (hoursSinceLastTaken > 1) {
                    triggerAlarm(medicine);
                }
            }
        });
    };

    const triggerAlarm = (medicine: Medicine): void => {
        setActiveAlarm(medicine);

        audio.loop = true;
        audio.play().catch(err => console.log('Audio play failed:', err));

        if (notificationPermission === 'granted') {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    title: '💊 Medicine Reminder',
                    body: `Time to take ${medicine.name}${medicine.dosage ? ` - ${medicine.dosage}` : ''}`,
                    tag: `medicine-${medicine.id}`
                });
            } else {
                new Notification('💊 Medicine Reminder', {
                    body: `Time to take ${medicine.name}${medicine.dosage ? ` - ${medicine.dosage}` : ''}`,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    requireInteraction: true,
                    tag: `medicine-${medicine.id}`,
                    vibrate: [200, 100, 200, 100, 200]
                } as NotificationOptions);
            }
        }

        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    };

    const dismissAlarm = (taken: boolean = false): void => {
        if (activeAlarm) {
            audio.pause();
            audio.currentTime = 0;

            if (taken && activeAlarm.id !== 'test') {
                setMedicines(medicines.map(m =>
                    m.id === activeAlarm.id
                        ? { ...m, lastTaken: new Date().toISOString(), snoozedUntil: null }
                        : m
                ));
            }

            setActiveAlarm(null);
        }
    };

    const snoozeAlarm = (minutes: number): void => {
        if (activeAlarm && activeAlarm.id !== 'test') {
            const snoozeUntil = new Date(Date.now() + minutes * 60000);
            setMedicines(medicines.map(m =>
                m.id === activeAlarm.id
                    ? { ...m, snoozedUntil: snoozeUntil.toISOString() }
                    : m
            ));
            dismissAlarm(false);
        } else {
            dismissAlarm(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
            <div className="w-full mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 p-3 rounded-xl">
                                <Clock className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Medicine Reminder</h1>
                                <p className="text-sm md:text-base text-gray-600">Never miss your medication</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Add Medicine
                        </button>
                    </div>

                    {showInstallPrompt && (
                        <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Download className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-purple-900 mb-1">📱 Install as App</h3>
                                    <p className="text-sm text-purple-800 mb-3">
                                        Install this app on your home screen for the best experience! It will work offline and send notifications even when the browser is closed.
                                    </p>
                                    <button
                                        onClick={handleInstallClick}
                                        className="bg-purple-600 text-white px-6 py-2 rounded font-semibold hover:bg-purple-700 transition-colors"
                                    >
                                        Install App
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showSetupGuide && (
                        <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 md:p-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-blue-900 mb-2 text-lg">⚠️ IMPORTANT: Setup Required</h3>
                                    <p className="text-sm text-blue-800 mb-3 font-semibold">
                                        For this app to work reliably, you MUST do the following:
                                    </p>
                                    <ol className="text-sm text-blue-800 space-y-2 mb-4 ml-4 list-decimal">
                                        <li><strong>Install the app</strong> using the purple banner above (if shown)</li>
                                        <li><strong>Enable Notifications</strong> (see the yellow banner below)</li>
                                        <li><strong>Keep the app running</strong> - Just switch to other apps, don't force close</li>
                                        <li><strong>Don't enable "Do Not Disturb"</strong> mode on your phone</li>
                                        <li><strong>Test it!</strong> Click "Test Alarm" button below to make sure it works</li>
                                    </ol>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={testAlarm}
                                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                            Test Alarm Now
                                        </button>
                                        <button
                                            onClick={() => setShowSetupGuide(false)}
                                            className="bg-blue-100 text-blue-800 px-4 py-2 rounded text-sm hover:bg-blue-200 transition-colors"
                                        >
                                            I understand
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {notificationPermission !== 'granted' && (
                        <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Bell className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-yellow-900 mb-1">🚨 Enable Notifications (Required!)</h3>
                                    <p className="text-sm text-yellow-800 mb-3">
                                        Click below and select "Allow" to receive medicine reminders!
                                    </p>
                                    <button
                                        onClick={requestNotificationPermission}
                                        className="bg-yellow-600 text-white px-6 py-2 rounded font-semibold hover:bg-yellow-700 transition-colors"
                                    >
                                        Enable Notifications
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {notificationPermission === 'granted' && (
                        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-green-800">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-semibold">✅ Notifications enabled! App is ready to remind you.</span>
                            </div>
                        </div>
                    )}

                    {showForm && (
                        <div className="mb-8 bg-gray-50 p-4 md:p-6 rounded-xl">
                            <h2 className="text-xl font-semibold mb-4">Add New Medicine</h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Medicine Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="e.g., Aspirin"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Dosage
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.dosage}
                                            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="e.g., 500mg or 1 tablet"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Time *
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Frequency
                                        </label>
                                        <select
                                            value={formData.frequency}
                                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="twice-daily">Twice Daily</option>
                                            <option value="three-times-daily">Three Times Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="as-needed">As Needed</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowForm(false)}
                                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddMedicine}
                                        disabled={!formData.name || !formData.time}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        Add Medicine
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {medicines.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                <p className="text-lg">No medicines added yet</p>
                                <p className="text-sm">Click "Add Medicine" to get started</p>
                            </div>
                        ) : (
                            medicines.map((medicine) => (
                                <div
                                    key={medicine.id}
                                    className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 md:p-6 rounded-xl border border-indigo-100 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2 break-words">
                                                {medicine.name}
                                            </h3>
                                            <div className="space-y-1 text-gray-600">
                                                {medicine.dosage && (
                                                    <p className="text-sm">Dosage: {medicine.dosage}</p>
                                                )}
                                                <p className="text-sm flex items-center gap-2">
                                                    <Clock className="w-4 h-4 flex-shrink-0" />
                                                    Time: {medicine.time}
                                                </p>
                                                <p className="text-sm capitalize">Frequency: {medicine.frequency.replace('-', ' ')}</p>
                                                {medicine.lastTaken && (
                                                    <p className="text-sm text-green-600">
                                                        Last taken: {new Date(medicine.lastTaken).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteMedicine(medicine.id)}
                                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {activeAlarm && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-pulse">
                            <div className="text-center">
                                <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Volume2 className="w-10 h-10 text-red-600" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                                    ⏰ Time for Medicine!
                                </h2>
                                <p className="text-xl text-gray-700 mb-2 font-semibold">{activeAlarm.name}</p>
                                {activeAlarm.dosage && (
                                    <p className="text-lg text-gray-600 mb-6">{activeAlarm.dosage}</p>
                                )}

                                <div className="space-y-3">
                                    <button
                                        onClick={() => dismissAlarm(true)}
                                        className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors"
                                    >
                                        ✓ I've Taken It
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => snoozeAlarm(5)}
                                            className="bg-yellow-500 text-white py-3 rounded-xl font-semibold hover:bg-yellow-600 transition-colors"
                                        >
                                            Snooze 5 min
                                        </button>
                                        <button
                                            onClick={() => snoozeAlarm(15)}
                                            className="bg-yellow-500 text-white py-3 rounded-xl font-semibold hover:bg-yellow-600 transition-colors"
                                        >
                                            Snooze 15 min
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => dismissAlarm(false)}
                                        className="w-full bg-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X className="w-5 h-5" />
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}