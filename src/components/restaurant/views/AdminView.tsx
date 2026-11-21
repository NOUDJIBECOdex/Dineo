import {
  Activity,
  Camera,
  Check,
  Globe,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { AppUser, BrandPaletteId, Employee, NavModuleId, RestaurantSettings } from '../../../types/erp';
import { formatFCFA } from '../../../utils/currency';
import { compressImageToDataUrl } from '../../../utils/image';
import { BRAND_PALETTES } from '../../../utils/theme';
import { NAV_GROUPS } from '../layout/RestaurantShell';
import {
  Btn,
  DialogModal,
  Field,
  PageHeader,
  RestaurantLogo,
  SearchInput,
  StatusPill,
  Surface,
  formatShortDateTime,
  inputBaseClass,
  inputBaseStyle,
} from '../ui/Primitives';

interface AdminViewProps {
  mode: 'staff' | 'users' | 'audit' | 'settings';
  onAfterUserSwitch?: (firstAllowed: NavModuleId) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ mode, onAfterUserSwitch }) => {
  const {
    state,
    currentUser,
    switchUser,
    saveEmployee,
    saveUser,
    deleteUser,
    updateSettings,
    toggleDarkMode,
    resetDemoData,
  } = useErp();

  // Staff modal
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<Employee['role']>('Serveur');
  const [empPhone, setEmpPhone] = useState('+237 6 ');
  const [empSalary, setEmpSalary] = useState(55000);
  const [empStatus, setEmpStatus] = useState<Employee['status']>('ACTIF');

  // Users modal
  const [usrModalOpen, setUsrModalOpen] = useState(false);
  const [editingUsr, setEditingUsr] = useState<AppUser | null>(null);
  const [uUsername, setUUsername] = useState('');
  const [uFullName, setUFullName] = useState('');
  const [uRole, setURole] = useState('Manager');
  const [uPassword, setUPassword] = useState('');
  const [uPerms, setUPerms] = useState<NavModuleId[]>(['dashboard', 'pos', 'kds', 'billing']);

  // Audit filter
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModule, setAuditModule] = useState('ALL');

  // Settings form
  const [settingsDraft, setSettingsDraft] = useState<RestaurantSettings>(state.settings);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [logoError, setLogoError] = useState('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    try {
      const dataUrl = await compressImageToDataUrl(file, {
        maxDimension: 256,
        quality: 0.9,
        preserveTransparency: true,
      });
      const updated = { ...settingsDraft, logoUrl: dataUrl };
      setSettingsDraft(updated);
      updateSettings(updated);
    } catch {
      setLogoError('Format image invalide. Utilisez un fichier PNG, JPG ou SVG.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSelectPalette = (paletteId: BrandPaletteId) => {
    const updated = { ...settingsDraft, accentPalette: paletteId };
    setSettingsDraft(updated);
    // Applique et sauvegarde immédiatement pour un aperçu temps réel sur toute l'interface
    updateSettings(updated);
  };

  const openNewEmp = () => {
    setEditingEmp(null);
    setEmpName('');
    setEmpRole('Serveur');
    setEmpPhone('+237 6 ');
    setEmpSalary(55000);
    setEmpStatus('ACTIF');
    setEmpModalOpen(true);
  };

  const openEditEmp = (e: Employee) => {
    setEditingEmp(e);
    setEmpName(e.fullName);
    setEmpRole(e.role);
    setEmpPhone(e.phone);
    setEmpSalary(e.baseSalary);
    setEmpStatus(e.status);
    setEmpModalOpen(true);
  };

  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    saveEmployee(
      {
        fullName: empName.trim(),
        role: empRole,
        phone: empPhone.trim(),
        baseSalary: Math.max(0, empSalary),
        hireDate: editingEmp?.hireDate || new Date().toISOString().slice(0, 10),
        status: empStatus,
      },
      editingEmp?.id
    );
    setEmpModalOpen(false);
  };

  const openNewUsr = () => {
    setEditingUsr(null);
    setUUsername('');
    setUFullName('');
    setURole('Manager');
    setUPassword('123456');
    setUPerms(['dashboard', 'pos', 'kds', 'billing', 'tables', 'reservations']);
    setUsrModalOpen(true);
  };

  const openEditUsr = (u: AppUser) => {
    setEditingUsr(u);
    setUUsername(u.username);
    setUFullName(u.fullName);
    setURole(u.roleLabel);
    setUPassword(u.password);
    setUPerms([...u.permissions]);
    setUsrModalOpen(true);
  };

  const togglePerm = (id: NavModuleId) => {
    setUPerms((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSaveUsr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uUsername.trim() || !uFullName.trim()) return;
    saveUser(
      {
        username: uUsername.trim(),
        fullName: uFullName.trim(),
        roleLabel: uRole.trim(),
        password: uPassword || '••••••••',
        isActive: true,
        permissions: uPerms.length > 0 ? uPerms : ['dashboard'],
      },
      editingUsr?.id
    );
    setUsrModalOpen(false);
  };

  const auditModules = useMemo(() => {
    const set = new Set(state.auditLogs.map((a) => a.module));
    return ['ALL', ...Array.from(set)];
  }, [state.auditLogs]);

  const filteredAudit = useMemo(() => {
    return state.auditLogs.filter((a) => {
      if (auditModule !== 'ALL' && a.module !== auditModule) return false;
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        return (
          a.actorName.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.details.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.auditLogs, auditModule, auditSearch]);

  // 1) STAFF
  if (mode === 'staff') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Personnel"
          description="Répertoire de votre équipe (cuisine, salle, caisse, livraison) relié au module Salaires."
          actions={
            <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={openNewEmp}>
              Ajouter un employé
            </Btn>
          }
        />

        <Surface padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr
                  className="border-b text-[11px] uppercase tracking-[0.05em]"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
                >
                  <th className="py-3 px-4 font-medium">Nom complet</th>
                  <th className="py-3 px-4 font-medium">Poste</th>
                  <th className="py-3 px-4 font-medium">Téléphone</th>
                  <th className="py-3 px-4 font-medium text-right">Salaire de base</th>
                  <th className="py-3 px-4 font-medium">Statut</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                {state.employees.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--bg-subtle)]">
                    <td className="py-3.5 px-4 font-medium">{e.fullName}</td>
                    <td className="py-3.5 px-4">{e.role}</td>
                    <td className="py-3.5 px-4 font-mono text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                      {e.phone}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold tabular-nums">{formatFCFA(e.baseSalary)}</td>
                    <td className="py-3.5 px-4">
                      <StatusPill tone={e.status === 'ACTIF' ? 'ok' : e.status === 'CONGE' ? 'warn' : 'neutral'}>
                        {e.status}
                      </StatusPill>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Btn variant="ghost" size="xs" onClick={() => openEditEmp(e)}>
                        Modifier
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <DialogModal isOpen={empModalOpen} onClose={() => setEmpModalOpen(false)} title={editingEmp ? 'Modifier l’employé' : 'Nouvel employé'} maxWidth="sm">
          <form onSubmit={handleSaveEmp} className="space-y-3.5">
            <Field label="Nom complet" required>
              <input type="text" required value={empName} onChange={(e) => setEmpName(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rôle">
                <select value={empRole} onChange={(e) => setEmpRole(e.target.value as Employee['role'])} style={inputBaseStyle} className={inputBaseClass}>
                  <option value="Gérant">Gérant</option>
                  <option value="Chef Cuisinier">Chef Cuisinier</option>
                  <option value="Cuisinier">Cuisinier</option>
                  <option value="Caissier">Caissier</option>
                  <option value="Serveur">Serveur</option>
                  <option value="Livreur">Livreur</option>
                </select>
              </Field>
              <Field label="Statut">
                <select value={empStatus} onChange={(e) => setEmpStatus(e.target.value as Employee['status'])} style={inputBaseStyle} className={inputBaseClass}>
                  <option value="ACTIF">Actif</option>
                  <option value="CONGE">En congé</option>
                  <option value="INACTIF">Inactif</option>
                </select>
              </Field>
            </div>
            <Field label="Téléphone" required>
              <input type="text" required value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Salaire mensuel de base (FCFA)">
              <input type="number" min={0} step={1000} value={empSalary} onChange={(e) => setEmpSalary(Number(e.target.value))} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setEmpModalOpen(false)}>
                Annuler
              </Btn>
              <Btn type="submit" variant="primary">
                Enregistrer
              </Btn>
            </div>
          </form>
        </DialogModal>
      </div>
    );
  }

  // 2) USERS & RBAC PERMISSIONS
  if (mode === 'users') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Utilisateurs & Permissions"
          description="Créez des accès personnalisés et choisissez exactement les pages visibles pour chaque profil."
          actions={
            <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={openNewUsr}>
              Créer un utilisateur
            </Btn>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {state.users.map((u) => {
            const isCurrent = u.id === currentUser.id;
            return (
              <Surface key={u.id} className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[14.5px]">{u.fullName}</h3>
                      {isCurrent && <StatusPill tone="accent">Session active</StatusPill>}
                    </div>
                    <div className="text-[12px] font-mono mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                      @{u.username} · {u.roleLabel}
                    </div>
                  </div>
                  <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--ink-muted)' }} />
                </div>

                <div className="p-3 rounded-lg border text-[12px]" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
                  <div className="font-medium mb-1">
                    Accès autorisé : {u.permissions.length} module(s)
                  </div>
                  <div className="line-clamp-2" style={{ color: 'var(--ink-muted)' }}>
                    {u.permissions.join(', ')}
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between gap-2">
                  <Btn
                    variant={isCurrent ? 'secondary' : 'primary'}
                    size="xs"
                    disabled={isCurrent}
                    leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                    onClick={() => {
                      switchUser(u.id);
                      if (onAfterUserSwitch && !u.permissions.includes('users') && u.permissions.length > 0) {
                        onAfterUserSwitch(u.permissions[0]);
                      }
                    }}
                  >
                    {isCurrent ? 'Actif' : 'Tester ce profil'}
                  </Btn>

                  <div className="flex items-center gap-1">
                    <Btn variant="ghost" size="xs" onClick={() => openEditUsr(u)}>
                      Permissions
                    </Btn>
                    {state.users.length > 1 && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => deleteUser(u.id)}
                        className="p-1.5 rounded hover:bg-[var(--err-bg)] cursor-pointer"
                        style={{ color: 'var(--ink-muted)' }}
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>

        <DialogModal
          isOpen={usrModalOpen}
          onClose={() => setUsrModalOpen(false)}
          title={editingUsr ? 'Modifier les permissions' : 'Nouvel utilisateur'}
          subtitle="Sélectionnez les pages que ce compte verra lors de sa connexion"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveUsr} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nom complet" required>
                <input type="text" required value={uFullName} onChange={(e) => setUFullName(e.target.value)} placeholder="ex: Moussa Manager" style={inputBaseStyle} className={inputBaseClass} />
              </Field>
              <Field label="Identifiant (Login)" required>
                <input type="text" required value={uUsername} onChange={(e) => setUUsername(e.target.value)} placeholder="ex: moussa.mgr" style={inputBaseStyle} className={inputBaseClass} />
              </Field>
              <Field label="Intitulé du rôle">
                <input type="text" value={uRole} onChange={(e) => setURole(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
              </Field>
              <Field label="Mot de passe">
                <input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} style={inputBaseStyle} className={inputBaseClass} />
              </Field>
            </div>

            <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">Pages autorisées ({uPerms.length})</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUPerms(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)))}
                    className="text-[12px] hover:underline cursor-pointer"
                    style={{ color: 'var(--accent)' }}
                  >
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    onClick={() => setUPerms(['dashboard'])}
                    className="text-[12px] hover:underline cursor-pointer"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    Minimum
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {NAV_GROUPS.map((group) => (
                  <div key={group.title} className="p-3 rounded-lg border space-y-2" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                      {group.title}
                    </div>
                    <div className="space-y-1.5">
                      {group.items.map((item) => (
                        <label key={item.id} className="flex items-center gap-2 text-[12.5px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uPerms.includes(item.id)}
                            onChange={() => togglePerm(item.id)}
                            className="accent-[#B84A27]"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setUsrModalOpen(false)}>
                Annuler
              </Btn>
              <Btn type="submit" variant="primary">
                Enregistrer le compte
              </Btn>
            </div>
          </form>
        </DialogModal>
      </div>
    );
  }

  // 3) AUDIT TRAIL
  if (mode === 'audit') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Journal d’Audit"
          description="Traçabilité complète de toutes les opérations réalisées dans le restaurant."
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <SearchInput value={auditSearch} onChange={setAuditSearch} placeholder="Rechercher une action, un employé, une commande..." className="w-full sm:w-80" />
          <select value={auditModule} onChange={(e) => setAuditModule(e.target.value)} style={inputBaseStyle} className="h-9 px-3 rounded-lg border text-[12.5px]">
            {auditModules.map((m) => (
              <option key={m} value={m}>
                {m === 'ALL' ? 'Tous les modules' : m}
              </option>
            ))}
          </select>
        </div>

        <Surface padding="none" className="overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
            {filteredAudit.map((entry) => (
              <div key={entry.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--bg-subtle)]">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="neutral" dot={false}>
                      {entry.module}
                    </StatusPill>
                    <span className="font-medium text-[13.5px]">{entry.action}</span>
                  </div>
                  <div className="text-[12.5px]" style={{ color: 'var(--ink-secondary)' }}>
                    {entry.details}
                  </div>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="text-[12.5px] font-medium flex sm:justify-end items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    {entry.actorName}
                  </div>
                  <div className="text-[11.5px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                    {formatShortDateTime(entry.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    );
  }

  // 4) SETTINGS
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settingsDraft);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Paramètres du Restaurant"
        description="Informations affichées sur vos tickets 80 mm, factures A4, paiements Mobile Money et apparence."
      />

      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* Identité visuelle : Logo & Palette de couleurs */}
        <Surface className="space-y-5">
          <div>
            <h2 className="text-[14.5px] font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Identité visuelle & Couleur de marque
            </h2>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              Personnalisez le logo de votre restaurant et choisissez votre palette d’accentuation.
            </p>
          </div>

          {/* Logo upload */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
            <div className="flex items-center gap-3.5">
              <RestaurantLogo logoUrl={settingsDraft.logoUrl} name={settingsDraft.name} size="lg" />
              <div>
                <div className="text-[13.5px] font-medium">Logo de l’établissement</div>
                <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                  Affiché dans le menu, sur vos tickets 80 mm, factures A4 et chevalets QR.
                </div>
                {logoError && (
                  <div className="text-[11.5px] mt-1" style={{ color: 'var(--err-text)' }}>
                    {logoError}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto shrink-0">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Btn
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Camera className="w-3.5 h-3.5" />}
                onClick={() => logoInputRef.current?.click()}
              >
                {settingsDraft.logoUrl ? 'Changer le logo' : 'Importer un logo'}
              </Btn>
              {settingsDraft.logoUrl && (
                <Btn
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<X className="w-3.5 h-3.5" />}
                  onClick={() => {
                    const updated = { ...settingsDraft, logoUrl: '' };
                    setSettingsDraft(updated);
                    updateSettings(updated);
                  }}
                >
                  Retirer
                </Btn>
              )}
            </div>
          </div>

          {/* Curated Brand Palettes */}
          <div className="space-y-2.5">
            <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink-secondary)' }}>
              Couleur d’accentuation préférée (aperçu instantané)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {BRAND_PALETTES.map((pal) => {
                const selected = (settingsDraft.accentPalette || 'terracotta') === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => handleSelectPalette(pal.id)}
                    style={{
                      backgroundColor: selected ? 'var(--accent-soft)' : 'var(--bg-surface)',
                      borderColor: selected ? 'var(--accent)' : 'var(--border-hairline)',
                    }}
                    className="p-3 rounded-xl border text-left transition-all duration-150 hover:border-[var(--border-strong)] cursor-pointer flex items-center gap-3"
                  >
                    <span
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center border border-black/10"
                      style={{ backgroundColor: pal.swatch }}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate">{pal.name}</div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>
                        {pal.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Surface>

        <Surface className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14.5px] font-semibold">Identité & Coordonnées (Maroua)</h2>
            <label className="inline-flex items-center gap-2 text-[12.5px] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={settingsDraft.isOpen}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, isOpen: e.target.checked })}
                style={{ accentColor: 'var(--accent)' }}
              />
              Restaurant ouvert
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom de l’établissement" required>
              <input type="text" required value={settingsDraft.name} onChange={(e) => setSettingsDraft({ ...settingsDraft, name: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Slogan">
              <input type="text" value={settingsDraft.tagline} onChange={(e) => setSettingsDraft({ ...settingsDraft, tagline: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Adresse (Quartier)">
              <input type="text" value={settingsDraft.address} onChange={(e) => setSettingsDraft({ ...settingsDraft, address: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ville">
                <input type="text" value={settingsDraft.city} onChange={(e) => setSettingsDraft({ ...settingsDraft, city: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
              </Field>
              <Field label="Région / Pays">
                <input type="text" value={settingsDraft.region} onChange={(e) => setSettingsDraft({ ...settingsDraft, region: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
              </Field>
            </div>
            <Field label="Téléphone">
              <input type="text" value={settingsDraft.phone} onChange={(e) => setSettingsDraft({ ...settingsDraft, phone: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Email">
              <input type="email" value={settingsDraft.email} onChange={(e) => setSettingsDraft({ ...settingsDraft, email: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="NIU / Identifiant fiscal">
              <input type="text" value={settingsDraft.taxNumber} onChange={(e) => setSettingsDraft({ ...settingsDraft, taxNumber: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Devise & Frais livraison par défaut">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={settingsDraft.currency} onChange={(e) => setSettingsDraft({ ...settingsDraft, currency: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
                <input type="number" step={100} value={settingsDraft.defaultDeliveryFee} onChange={(e) => setSettingsDraft({ ...settingsDraft, defaultDeliveryFee: Number(e.target.value) })} style={inputBaseStyle} className={`${inputBaseClass} tabular-nums`} />
              </div>
            </Field>
          </div>

          <Field
            label="Domaine web ou adresse Wi-Fi pour les QR Codes des tables"
            hint="Laissez vide pour utiliser l’adresse actuelle, ou saisissez votre futur domaine (ex: https://menu.sahelgourmand.cm) ou IP Wi-Fi locale."
          >
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-muted)' }} />
              <input
                type="text"
                value={settingsDraft.publicBaseUrl || ''}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, publicBaseUrl: e.target.value })}
                placeholder="https://sahelgourmand-maroua.cm"
                style={inputBaseStyle}
                className={`${inputBaseClass} pl-9 font-mono text-[12.5px]`}
              />
            </div>
          </Field>
        </Surface>

        <Surface className="space-y-4">
          <h2 className="text-[14.5px] font-semibold">Mobile Money & Tickets 80 mm</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Code Marchand Orange Money">
              <input type="text" value={settingsDraft.orangeMoneyMerchant} onChange={(e) => setSettingsDraft({ ...settingsDraft, orangeMoneyMerchant: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
            <Field label="Compte MTN Mobile Money">
              <input type="text" value={settingsDraft.mtnMomoMerchant} onChange={(e) => setSettingsDraft({ ...settingsDraft, mtnMomoMerchant: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
            </Field>
          </div>
          <Field label="Message pied de ticket (80 mm & A4)">
            <input type="text" value={settingsDraft.receiptFooter} onChange={(e) => setSettingsDraft({ ...settingsDraft, receiptFooter: e.target.value })} style={inputBaseStyle} className={inputBaseClass} />
          </Field>
        </Surface>

        <Surface className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[14.5px] font-semibold">Apparence de l’interface</h2>
            <p className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
              Basculez entre le thème clair (jour) et le thème sombre (service du soir).
            </p>
          </div>
          <Btn
            type="button"
            variant="secondary"
            leftIcon={state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            onClick={toggleDarkMode}
          >
            {state.darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
          </Btn>
        </Surface>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Btn
            type="button"
            variant="danger"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={() => {
              resetDemoData();
              setSettingsDraft(state.settings);
            }}
          >
            Réinitialiser les données démo
          </Btn>

          <div className="flex items-center gap-3">
            {settingsSaved && (
              <span className="text-[12.5px] font-medium flex items-center gap-1" style={{ color: 'var(--ok-text)' }}>
                <Check className="w-4 h-4" />
                Paramètres enregistrés
              </span>
            )}
            <Btn type="submit" variant="accent" leftIcon={<Save className="w-4 h-4" />}>
              Enregistrer les paramètres
            </Btn>
          </div>
        </div>
      </form>
    </div>
  );
};
