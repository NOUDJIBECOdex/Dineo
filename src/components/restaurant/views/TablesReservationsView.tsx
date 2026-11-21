import {
  CalendarClock,
  Check,
  Clock,
  LayoutGrid,
  List,
  Plus,
  QrCode,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useErp } from '../../../store/erp.context';
import type { DiningTable, ReservationStatus, TableStatus } from '../../../types/erp';
import { AllTablesQrSheetModal, TableQrModal } from '../print/PrintModals';
import {
  Btn,
  DialogModal,
  EmptyState,
  Field,
  FilterTabs,
  PageHeader,
  SearchInput,
  StatusPill,
  Surface,
  inputBaseClass,
  inputBaseStyle,
} from '../ui/Primitives';
import type { PillTone } from '../ui/Primitives';

const tableTone = (s: TableStatus): { label: string; tone: PillTone; border: string; fill: string; seat: string } => {
  switch (s) {
    case 'OCCUPEE':
      return {
        label: 'Occupée',
        tone: 'accent',
        border: 'var(--accent-border)',
        fill: 'var(--accent-soft)',
        seat: 'var(--accent)',
      };
    case 'RESERVEE':
      return {
        label: 'Réservée',
        tone: 'warn',
        border: 'var(--warn-border)',
        fill: 'var(--warn-bg)',
        seat: 'var(--warn-dot)',
      };
    default:
      return {
        label: 'Libre',
        tone: 'ok',
        border: 'var(--ok-border)',
        fill: 'var(--ok-bg)',
        seat: 'var(--ok-dot)',
      };
  }
};

const resTone = (s: ReservationStatus): { label: string; tone: PillTone } => {
  switch (s) {
    case 'CONFIRMEE':
      return { label: 'Confirmée', tone: 'warn' };
    case 'EN_COURS':
      return { label: 'Installée', tone: 'accent' };
    case 'TERMINEE':
      return { label: 'Terminée', tone: 'ok' };
    case 'ANNULEE':
      return { label: 'Annulée', tone: 'err' };
  }
};

/** Architectural minimalist visual seat diagram around a table */
const TableDiagram: React.FC<{ table: DiningTable }> = ({ table }) => {
  const cfg = tableTone(table.status);
  const topSeats = Math.ceil(table.seats / 4);
  const bottomSeats = Math.ceil((table.seats - topSeats) / 3);
  const remaining = Math.max(0, table.seats - topSeats - bottomSeats);
  const leftSeats = Math.ceil(remaining / 2);
  const rightSeats = Math.max(0, remaining - leftSeats);

  const renderDots = (count: number, vertical = false) => (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-row'} items-center justify-center gap-2`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="w-3 h-3 rounded-full border"
          style={{ backgroundColor: cfg.fill, borderColor: cfg.seat }}
        />
      ))}
    </div>
  );

  return (
    <div
      className="h-40 rounded-lg border flex flex-col items-center justify-center gap-2.5 p-3"
      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
    >
      {renderDots(topSeats)}
      <div className="flex items-center justify-center gap-2.5">
        {renderDots(leftSeats, true)}
        <div
          className="min-w-[88px] px-4 py-3 rounded-lg border text-center"
          style={{ backgroundColor: cfg.fill, borderColor: cfg.border }}
        >
          <div className="font-mono font-semibold text-[14px]" style={{ color: 'var(--ink-primary)' }}>
            {table.number}
          </div>
          <div className="text-[10.5px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            {table.seats} places
          </div>
        </div>
        {renderDots(rightSeats, true)}
      </div>
      {renderDots(bottomSeats)}
    </div>
  );
};

interface TablesReservationsViewProps {
  mode: 'tables' | 'reservations';
  onTestTableQr?: (tableNumber: string) => void;
}

export const TablesReservationsView: React.FC<TablesReservationsViewProps> = ({ mode, onTestTableQr }) => {
  const {
    state,
    saveTable,
    updateTableStatus,
    deleteTable,
    addReservation,
    updateReservationStatus,
  } = useErp();

  // Tables state
  const [viewMode, setViewMode] = useState<'VISUAL' | 'LIST'>('VISUAL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TableStatus>('ALL');
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [qrTable, setQrTable] = useState<DiningTable | null>(null);
  const [allQrOpen, setAllQrOpen] = useState(false);
  const [tNumber, setTNumber] = useState('T-09');
  const [tZone, setTZone] = useState<DiningTable['zone']>('Salle Principale');
  const [tSeats, setTSeats] = useState(4);

  // Reservations state
  const [resModalOpen, setResModalOpen] = useState(false);
  const [rName, setRName] = useState('');
  const [rPhone, setRPhone] = useState('+237 6 ');
  const [rTableId, setRTableId] = useState(state.tables[0]?.id || '');
  const [rGuests, setRGuests] = useState(4);
  const [rDate, setRDate] = useState(new Date().toISOString().slice(0, 10));
  const [rTime, setRTime] = useState('13:00');
  const [rNotes, setRNotes] = useState('');

  const filteredTables = useMemo(() => {
    return state.tables.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return t.number.toLowerCase().includes(q) || t.zone.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [state.tables, statusFilter, search]);

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tNumber.trim()) return;
    saveTable({
      number: tNumber.trim().toUpperCase(),
      name: `Table ${tNumber.trim().toUpperCase()}`,
      zone: tZone,
      seats: Math.max(1, tSeats),
      status: 'LIBRE',
    });
    setTNumber(`T-${String(state.tables.length + 2).padStart(2, '0')}`);
    setTableModalOpen(false);
  };

  const handleAddReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rName.trim()) return;
    const tbl = state.tables.find((t) => t.id === rTableId);
    addReservation({
      customerName: rName.trim(),
      customerPhone: rPhone.trim(),
      tableId: rTableId,
      tableNumber: tbl?.number || 'T-01',
      guests: rGuests,
      date: rDate,
      time: rTime,
      notes: rNotes.trim() || undefined,
    });
    setRName('');
    setRPhone('+237 6 ');
    setRNotes('');
    setResModalOpen(false);
  };

  if (mode === 'reservations') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Réservations"
          description="Planifiez les réservations de tables et libérez-les automatiquement en fin de service."
          actions={
            <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setResModalOpen(true)}>
              Nouvelle réservation
            </Btn>
          }
        />

        {state.reservations.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="w-5 h-5" />}
            title="Aucune réservation enregistrée"
            description="Ajoutez une réservation client pour bloquer automatiquement la table associée."
          />
        ) : (
          <Surface padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr
                    className="border-b text-[11px] uppercase tracking-[0.05em]"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
                  >
                    <th className="py-3 px-4 font-medium">Client</th>
                    <th className="py-3 px-4 font-medium">Date & Heure</th>
                    <th className="py-3 px-4 font-medium">Table & Couverts</th>
                    <th className="py-3 px-4 font-medium">Statut</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                  {state.reservations.map((r) => {
                    const meta = resTone(r.status);
                    return (
                      <tr key={r.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium">{r.customerName}</div>
                          <div className="text-[11.5px] font-mono" style={{ color: 'var(--ink-muted)' }}>
                            {r.customerPhone}
                          </div>
                          {r.notes && (
                            <div className="text-[11.5px] italic mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                              {r.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 tabular-nums">
                          <div className="font-medium">{r.date}</div>
                          <div className="text-[11.5px] flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                            <Clock className="w-3 h-3" />
                            {r.time}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-medium">{r.tableNumber}</span>
                          <span className="text-[12px] ml-2" style={{ color: 'var(--ink-muted)' }}>
                            ({r.guests} pers.)
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === 'CONFIRMEE' && (
                              <Btn variant="secondary" size="xs" onClick={() => updateReservationStatus(r.id, 'EN_COURS')}>
                                Installer
                              </Btn>
                            )}
                            {(r.status === 'CONFIRMEE' || r.status === 'EN_COURS') && (
                              <>
                                <Btn
                                  variant="primary"
                                  size="xs"
                                  leftIcon={<Check className="w-3.5 h-3.5" />}
                                  onClick={() => updateReservationStatus(r.id, 'TERMINEE')}
                                >
                                  Terminée
                                </Btn>
                                <Btn
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => updateReservationStatus(r.id, 'ANNULEE')}
                                  title="Annuler"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Btn>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>
        )}

        <DialogModal
          isOpen={resModalOpen}
          onClose={() => setResModalOpen(false)}
          title="Nouvelle réservation"
          subtitle="La table sélectionnée passera automatiquement en statut Réservée"
          maxWidth="sm"
        >
          <form onSubmit={handleAddReservation} className="space-y-3.5">
            <Field label="Nom du client" required>
              <input
                type="text"
                required
                value={rName}
                onChange={(e) => setRName(e.target.value)}
                placeholder="ex: Sarah Bello"
                style={inputBaseStyle}
                className={inputBaseClass}
              />
            </Field>
            <Field label="Téléphone" required>
              <input
                type="text"
                required
                value={rPhone}
                onChange={(e) => setRPhone(e.target.value)}
                style={inputBaseStyle}
                className={inputBaseClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Table">
                <select
                  value={rTableId}
                  onChange={(e) => setRTableId(e.target.value)}
                  style={inputBaseStyle}
                  className={inputBaseClass}
                >
                  {state.tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.number} ({t.seats} pl.)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nombre de personnes">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rGuests}
                  onChange={(e) => setRGuests(Number(e.target.value))}
                  style={inputBaseStyle}
                  className={`${inputBaseClass} tabular-nums`}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input
                  type="date"
                  value={rDate}
                  onChange={(e) => setRDate(e.target.value)}
                  style={inputBaseStyle}
                  className={inputBaseClass}
                />
              </Field>
              <Field label="Heure">
                <input
                  type="time"
                  value={rTime}
                  onChange={(e) => setRTime(e.target.value)}
                  style={inputBaseStyle}
                  className={inputBaseClass}
                />
              </Field>
            </div>
            <Field label="Note (optionnel)">
              <input
                type="text"
                value={rNotes}
                onChange={(e) => setRNotes(e.target.value)}
                placeholder="Préférence de plat ou occasion..."
                style={inputBaseStyle}
                className={inputBaseClass}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setResModalOpen(false)}>
                Annuler
              </Btn>
              <Btn type="submit" variant="accent">
                Confirmer la réservation
              </Btn>
            </div>
          </form>
        </DialogModal>
      </div>
    );
  }

  // TABLES VIEW
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan de salle & Tables"
        description="Gérez vos tables, leur occupation en direct et leurs chevalets QR Code scannables."
        actions={
          <>
            <Btn variant="secondary" leftIcon={<QrCode className="w-4 h-4" />} onClick={() => setAllQrOpen(true)}>
              Planche QR (A4)
            </Btn>
            <Btn variant="accent" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setTableModalOpen(true)}>
              Ajouter une table
            </Btn>
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterTabs
            activeId={statusFilter}
            onChange={(id) => setStatusFilter(id as typeof statusFilter)}
            tabs={[
              { id: 'ALL', label: 'Toutes', count: state.tables.length },
              { id: 'LIBRE', label: 'Libres', count: state.tables.filter((t) => t.status === 'LIBRE').length },
              { id: 'OCCUPEE', label: 'Occupées', count: state.tables.filter((t) => t.status === 'OCCUPEE').length },
              { id: 'RESERVEE', label: 'Réservées', count: state.tables.filter((t) => t.status === 'RESERVEE').length },
            ]}
          />
          <div
            className="inline-flex p-1 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('VISUAL')}
              style={{
                backgroundColor: viewMode === 'VISUAL' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'VISUAL' ? 'var(--ink-primary)' : 'var(--ink-muted)',
              }}
              className="px-2.5 py-1 rounded-md text-[12px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Visuel
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              style={{
                backgroundColor: viewMode === 'LIST' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'LIST' ? 'var(--ink-primary)' : 'var(--ink-muted)',
              }}
              className="px-2.5 py-1 rounded-md text-[12px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
              Liste
            </button>
          </div>
        </div>

        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une table ou zone..." className="w-full md:w-64" />
      </div>

      {viewMode === 'VISUAL' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((tbl) => {
            const cfg = tableTone(tbl.status);
            return (
              <Surface key={tbl.id} padding="sm" className="space-y-3">
                <TableDiagram table={tbl} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[14px]">{tbl.name}</div>
                    <div className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                      {tbl.zone}
                    </div>
                  </div>
                  <StatusPill tone={cfg.tone}>{cfg.label}</StatusPill>
                </div>

                <div className="pt-2.5 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div className="flex items-center gap-1">
                    {(['LIBRE', 'OCCUPEE', 'RESERVEE'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => updateTableStatus(tbl.id, st)}
                        style={{
                          backgroundColor: tbl.status === st ? 'var(--ink-primary)' : 'var(--bg-subtle)',
                          color: tbl.status === st ? 'var(--ink-inverse)' : 'var(--ink-muted)',
                        }}
                        className="px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors"
                      >
                        {st === 'LIBRE' ? 'Libre' : st === 'OCCUPEE' ? 'Occup.' : 'Rés.'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQrTable(tbl)}
                      className="p-1.5 rounded-md border hover:bg-[var(--bg-subtle)] cursor-pointer"
                      style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
                      title="Afficher / imprimer le QR Code de table"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTable(tbl.id)}
                      className="p-1.5 rounded-md border hover:bg-[var(--err-bg)] cursor-pointer"
                      style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)' }}
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      ) : (
        <Surface padding="none" className="overflow-hidden">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr
                className="border-b text-[11px] uppercase tracking-[0.05em]"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)', backgroundColor: 'var(--bg-subtle)' }}
              >
                <th className="py-3 px-4 font-medium">Table</th>
                <th className="py-3 px-4 font-medium">Zone</th>
                <th className="py-3 px-4 font-medium">Capacité</th>
                <th className="py-3 px-4 font-medium">Statut</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
              {filteredTables.map((tbl) => {
                const cfg = tableTone(tbl.status);
                return (
                  <tr key={tbl.id} className="hover:bg-[var(--bg-subtle)]">
                    <td className="py-3 px-4 font-semibold font-mono">{tbl.number}</td>
                    <td className="py-3 px-4">{tbl.zone}</td>
                    <td className="py-3 px-4 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" style={{ color: 'var(--ink-muted)' }} />
                        {tbl.seats} places
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusPill tone={cfg.tone}>{cfg.label}</StatusPill>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Btn variant="secondary" size="xs" leftIcon={<QrCode className="w-3.5 h-3.5" />} onClick={() => setQrTable(tbl)}>
                          QR Code
                        </Btn>
                        <select
                          value={tbl.status}
                          onChange={(e) => updateTableStatus(tbl.id, e.target.value as TableStatus)}
                          style={inputBaseStyle}
                          className="h-7 px-2 rounded-md border text-[12px]"
                        >
                          <option value="LIBRE">Libre</option>
                          <option value="OCCUPEE">Occupée</option>
                          <option value="RESERVEE">Réservée</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Surface>
      )}

      <DialogModal
        isOpen={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        title="Ajouter une table"
        subtitle="Configurez le numéro, la zone et la capacité"
        maxWidth="sm"
      >
        <form onSubmit={handleAddTable} className="space-y-3.5">
          <Field label="Numéro de table" required>
            <input
              type="text"
              required
              value={tNumber}
              onChange={(e) => setTNumber(e.target.value)}
              placeholder="ex: T-09 ou VIP-02"
              style={inputBaseStyle}
              className={inputBaseClass}
            />
          </Field>
          <Field label="Zone du restaurant">
            <select
              value={tZone}
              onChange={(e) => setTZone(e.target.value as DiningTable['zone'])}
              style={inputBaseStyle}
              className={inputBaseClass}
            >
              <option value="Salle Principale">Salle Principale</option>
              <option value="Terrasse Sahel">Terrasse Sahel</option>
              <option value="Espace Famille">Espace Famille</option>
              <option value="Salon VIP">Salon VIP</option>
            </select>
          </Field>
          <Field label="Nombre de places" required>
            <input
              type="number"
              min={1}
              max={16}
              value={tSeats}
              onChange={(e) => setTSeats(Number(e.target.value))}
              style={inputBaseStyle}
              className={`${inputBaseClass} tabular-nums`}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="secondary" onClick={() => setTableModalOpen(false)}>
              Annuler
            </Btn>
            <Btn type="submit" variant="primary">
              Créer la table
            </Btn>
          </div>
        </form>
      </DialogModal>

      <TableQrModal
        table={qrTable}
        settings={state.settings}
        onClose={() => setQrTable(null)}
        onTestScan={onTestTableQr}
      />
      <AllTablesQrSheetModal
        isOpen={allQrOpen}
        tables={state.tables}
        settings={state.settings}
        onClose={() => setAllQrOpen(false)}
      />
    </div>
  );
};
