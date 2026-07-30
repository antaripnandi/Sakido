import React, { useState } from 'react';
import { 
  Check, 
  ArrowRight, 
  Info, 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  AlertCircle,
  ExternalLink,
  Zap
} from 'lucide-react';

export interface ConnectorsState {
  googleCalendar: boolean;
  googleDrive: boolean;
  gmail: boolean;
  accountEmail?: string;
  lastSyncedAt?: Record<string, string>;
}

interface ConnectorsViewProps {
  connectors: ConnectorsState;
  connectingService: string | null;
  connectorNotice: string | null;
  onConnect: (serviceKey: 'googleCalendar' | 'googleDrive' | 'gmail') => void;
  onDisconnect: (serviceKey: 'googleCalendar' | 'googleDrive' | 'gmail') => void;
  onDismissNotice: () => void;
  executeGoogleApi?: <T>(apiCall: (token: string) => Promise<Response>) => Promise<Response | null>;
}

const SERVICE_CONFIGS = [
  {
    key: 'googleCalendar' as const,
    name: 'Google Calendar',
    logo: '/logos/google-calendar.webp',
    description: 'Sync deadlines, exam timetables, and lecture schedules directly into your Sakido schedule.',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
    permissions: [
      'Read lecture timetables and exam dates',
      'Create and update academic deadline events',
    ],
  },
  {
    key: 'googleDrive' as const,
    name: 'Google Drive & Notes Sync',
    logo: '/logos/google-drive.webp',
    description: 'Auto-sync course notes, lecture slides, and research PDFs to your dedicated Google Drive folder.',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    permissions: [
      'Create a Sakido Notes folder in your Google Drive',
      'Save markdown lecture summaries and note exports',
    ],
  },
  {
    key: 'gmail' as const,
    name: 'Gmail Notifications',
    logo: '/logos/gmail.webp',
    description: 'Receive important campus announcements, grade releases, and assignment reminders.',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    permissions: [
      'Fetch course announcements and professor email alerts',
    ],
  },
];

export const ConnectorsView: React.FC<ConnectorsViewProps> = ({
  connectors,
  connectingService,
  connectorNotice,
  onConnect,
  onDisconnect,
  onDismissNotice,
  executeGoogleApi,
}) => {
  // Modal states for permission disclosure & disconnect confirmation
  const [permissionModalService, setPermissionModalService] = useState<typeof SERVICE_CONFIGS[0] | null>(null);
  const [disconnectConfirmService, setDisconnectConfirmService] = useState<typeof SERVICE_CONFIGS[0] | null>(null);
  
  // Test connection feedback per service
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'failed'>>({});

  const handleTestConnection = async (serviceKey: 'googleCalendar' | 'googleDrive' | 'gmail') => {
    if (!executeGoogleApi) return;
    setTestResults((prev) => ({ ...prev, [serviceKey]: 'testing' }));

    try {
      // Zapier/Linear pattern: call lightweight endpoint GET /calendar/v3/users/me/calendarList?maxResults=1
      const res = await executeGoogleApi((token) =>
        fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      if (res && res.ok) {
        setTestResults((prev) => ({ ...prev, [serviceKey]: 'success' }));
      } else {
        setTestResults((prev) => ({ ...prev, [serviceKey]: 'failed' }));
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [serviceKey]: 'failed' }));
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div>
        <h3 className="font-display text-2xl font-bold text-on-surface">Service Connectors</h3>
        <p className="text-sm text-secondary mt-1">
          Integrate external Google Workspace services with explicit permission transparency and 1:1 data sync.
        </p>
      </div>

      {/* Notice Banner */}
      {connectorNotice && (
        <div className="p-4 rounded-2xl border border-primary/30 bg-surface-container-low text-xs text-on-surface flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">OAuth Status Notice: </span>
            {connectorNotice}
          </div>
          <button
            onClick={onDismissNotice}
            className="text-secondary hover:text-on-surface text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connector Cards */}
      <div className="flex flex-col gap-4">
        {SERVICE_CONFIGS.map((service) => {
          const isConnected = Boolean(connectors[service.key]);
          const isConnecting = connectingService === service.key;
          const testStatus = testResults[service.key];
          const lastSynced = connectors.lastSyncedAt?.[service.key];

          return (
            <div
              key={service.key}
              className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                isConnected
                  ? 'border-primary/40 bg-surface-container-low shadow-2xs'
                  : 'border-outline-variant/40 bg-surface-container-low/60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high p-2 flex items-center justify-center shrink-0 border border-outline-variant/20">
                  <img src={service.logo} alt={service.name} className="w-8 h-8 object-contain" loading="lazy" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display font-bold text-base text-on-surface">{service.name}</h4>
                    {isConnected ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary text-[11px] font-mono font-medium">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1 max-w-md">{service.description}</p>
                  
                  {/* Notion/Zapier metadata labels */}
                  {isConnected && (
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-secondary font-mono flex-wrap">
                      <span>Connected as <strong className="text-on-surface">{connectors.accountEmail || 'Google Account'}</strong></span>
                      {lastSynced && <span>• Last synced {lastSynced}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {isConnected && (
                  <button
                    onClick={() => handleTestConnection(service.key)}
                    disabled={testStatus === 'testing'}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant/50 text-xs font-medium text-on-surface hover:bg-surface-container-high flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? '✓ Valid' : testStatus === 'failed' ? '✗ Failed' : 'Test'}
                  </button>
                )}

                {isConnected ? (
                  <button
                    onClick={() => setDisconnectConfirmService(service)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-outline-variant text-on-surface hover:bg-surface-container-high flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-secondary" />
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => setPermissionModalService(service)}
                    disabled={isConnecting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:opacity-90 text-on-primary flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {isConnecting ? (
                      <>Connecting...</>
                    ) : (
                      <>Connect <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notion-style Permission Scope Modal */}
      {permissionModalService && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high p-2 flex items-center justify-center shrink-0">
                <img src={permissionModalService.logo} alt={permissionModalService.name} className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-on-surface">Connect {permissionModalService.name}</h4>
                <p className="text-xs text-secondary font-mono">Permission Scopes Transparency</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs space-y-2">
              <span className="font-bold text-on-surface flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sakido will request access to:
              </span>
              <ul className="space-y-1.5 pl-5 list-disc text-secondary">
                {permissionModalService.permissions.map((perm, idx) => (
                  <li key={idx}>{perm}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPermissionModalService(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-outline-variant text-secondary hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = permissionModalService.key;
                  setPermissionModalService(null);
                  onConnect(target);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:opacity-90 cursor-pointer flex items-center gap-1.5"
              >
                Authorize & Connect <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zapier-style Disconnect Confirmation Modal */}
      {disconnectConfirmService && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h4 className="font-display font-bold text-base text-on-surface">Disconnect {disconnectConfirmService.name}?</h4>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Disconnecting will revoke access and purge cached authorization tokens from local storage. Synced external calendar events and drive notes will no longer update.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDisconnectConfirmService(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-outline-variant text-secondary hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = disconnectConfirmService.key;
                  setDisconnectConfirmService(null);
                  onDisconnect(target);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
              >
                Disconnect & Purge Tokens
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
