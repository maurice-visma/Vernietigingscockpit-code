import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpDown,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Eye,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import ActionPanel, {
  ActionPanelButton,
  ActionPanelButtonGroup,
  ActionPanelChoice,
  ActionPanelSection,
  ActionPanelShortcuts,
  ActionPanelSummary,
} from "../components/ActionPanel";
import ContentPanel, {
  ContentPanelBody,
  ContentPanelHeader,
  ContentPanelSection,
  ContentPanelStat,
  ContentPanelStatGrid,
} from "../components/ContentPanel";
import StatusBadge from "../components/StatusBadge";
import TaskExecutionContextBar from "../features/task-execution/components/TaskExecutionContextBar";
import {
  recordSelectionQuickFilters,
  recordSelectionRecords,
  recordSelectionSortOptions,
  recordSelectionTaskMetaItems,
} from "../shared/mocks/recordSelectionPage";
import type {
  RecordSelectionQuickFilter,
  RecordSelectionRecord,
  RecordSelectionSortOption,
} from "../shared/types/recordSelection";

type SelectedActionId = "bulk-beoordelen" | "selectie-opslaan";

const PAGE_SIZE = 6;

const DUTCH_MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mrt: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  dec: 11,
};

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function parseDutchDate(value: string) {
  const [day, month, year] = value.split(" ");
  const monthIndex = DUTCH_MONTH_MAP[month?.toLowerCase() ?? ""] ?? 0;

  return new Date(Number(year), monthIndex, Number(day)).getTime();
}

function getStatusBadge(record: RecordSelectionRecord) {
  switch (record.status) {
    case "selecteerbaar":
      return "SUCCES";
    case "controle-nodig":
      return "WAARSCHUWING";
    case "uitgesloten":
      return "OVERIG";
  }
}

function isRecordSelectable(record: RecordSelectionRecord) {
  return record.status !== "uitgesloten";
}

function getQuickFilterCopy(filter: RecordSelectionQuickFilter) {
  const labels = [
    filter.department,
    filter.source,
    filter.status === "controle-nodig"
      ? "controle nodig"
      : filter.status === "selecteerbaar"
        ? "direct selecteerbaar"
        : filter.status === "uitgesloten"
          ? "uitgesloten"
          : undefined,
  ].filter(Boolean);

  return labels.join(" | ");
}

export default function RecordSelectionPage() {
  const navigate = useNavigate();
  const { taakId, id } = useParams();

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("alle");
  const [sourceFilter, setSourceFilter] = useState("alle");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [sortBy, setSortBy] =
    useState<RecordSelectionSortOption["id"]>("destroyable-since");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAction, setSelectedAction] =
    useState<SelectedActionId>("bulk-beoordelen");
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);
  const [activeQuickFilterId, setActiveQuickFilterId] = useState<string | null>(null);
  const [savedSelectionMessage, setSavedSelectionMessage] = useState<string | null>(
    null
  );

  const departments = useMemo(
    () => ["alle", ...new Set(recordSelectionRecords.map((record) => record.department))],
    []
  );
  const sources = useMemo(
    () => ["alle", ...new Set(recordSelectionRecords.map((record) => record.source))],
    []
  );

  const filteredRecords = useMemo(() => {
    const normalizedSearch = normalizeValue(search);

    return recordSelectionRecords.filter((record) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          record.id,
          record.title,
          record.description,
          record.recordType,
          record.department,
          record.source,
          record.caseType,
        ].some((value) => normalizeValue(value).includes(normalizedSearch));

      const matchesDepartment =
        departmentFilter === "alle" || record.department === departmentFilter;
      const matchesSource = sourceFilter === "alle" || record.source === sourceFilter;
      const matchesStatus = statusFilter === "alle" || record.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesSource && matchesStatus;
    });
  }, [departmentFilter, search, sourceFilter, statusFilter]);

  const sortedRecords = useMemo(() => {
    const sorted = [...filteredRecords];

    sorted.sort((left, right) => {
      if (sortBy === "title") {
        return left.title.localeCompare(right.title, "nl");
      }

      if (sortBy === "department") {
        return left.department.localeCompare(right.department, "nl");
      }

      return parseDutchDate(left.destroyableSince) - parseDutchDate(right.destroyableSince);
    });

    return sorted;
  }, [filteredRecords, sortBy]);

  const pageCount = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const pagedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return sortedRecords.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, sortedRecords]);

  const filteredRecordIds = useMemo(
    () => new Set(sortedRecords.map((record) => record.id)),
    [sortedRecords]
  );

  const filteredSelectableIds = useMemo(
    () => sortedRecords.filter(isRecordSelectable).map((record) => record.id),
    [sortedRecords]
  );

  useEffect(() => {
    setSelectedRecordIds((current) =>
      current.filter((recordId) => filteredRecordIds.has(recordId))
    );
  }, [filteredRecordIds]);

  useEffect(() => {
    if (allFilteredSelected && filteredSelectableIds.length === 0) {
      setAllFilteredSelected(false);
    }
  }, [allFilteredSelected, filteredSelectableIds.length]);

  const effectiveSelectedIds = allFilteredSelected
    ? filteredSelectableIds
    : selectedRecordIds;
  const selectedCount = effectiveSelectedIds.length;

  const selectedRecords = useMemo(() => {
    const selectedSet = new Set(effectiveSelectedIds);

    return sortedRecords.filter((record) => selectedSet.has(record.id));
  }, [effectiveSelectedIds, sortedRecords]);

  const selectedRecord =
    selectedRecords.length === 1 ? selectedRecords[0] : undefined;

  const selectablePageIds = pagedRecords
    .filter(isRecordSelectable)
    .map((record) => record.id);
  const selectedPageCount = allFilteredSelected
    ? selectablePageIds.length
    : selectablePageIds.filter((recordId) => selectedRecordIds.includes(recordId)).length;
  const pageFullySelected =
    selectablePageIds.length > 0 && selectedPageCount === selectablePageIds.length;

  const excludedCount = filteredRecords.length - filteredSelectableIds.length;
  const directSelectableCount = filteredRecords.filter(
    (record) => record.status === "selecteerbaar"
  ).length;
  const attentionCount = filteredRecords.filter(
    (record) => record.status === "controle-nodig"
  ).length;

  const canRunPrimaryAction = selectedCount > 0;
  const selectionScopeLabel = allFilteredSelected
    ? "Alle gefilterde records"
    : selectedCount === 1
      ? "1 record handmatig geselecteerd"
      : selectedCount > 1
        ? `${selectedCount} records handmatig geselecteerd`
        : "Nog geen selectie";

  const handlePrimaryAction = () => {
    if (!canRunPrimaryAction) {
      return;
    }

    if (selectedAction === "bulk-beoordelen") {
      navigate(`/taak/${taakId}/taakuitvoering/${id}/beoordeling`);
      return;
    }

    setSavedSelectionMessage(
      allFilteredSelected
        ? `Selectievoorstel opgeslagen voor alle ${selectedCount} gefilterde records.`
        : `Selectievoorstel opgeslagen voor ${selectedCount} records.`
    );
  };

  const clearSelection = () => {
    setSelectedRecordIds([]);
    setAllFilteredSelected(false);
  };

  const handleSecondaryAction = () => {
    clearSelection();
  };

  const toggleRecord = (recordId: string) => {
    setAllFilteredSelected(false);
    setSelectedRecordIds((current) =>
      current.includes(recordId)
        ? current.filter((idValue) => idValue !== recordId)
        : [...current, recordId]
    );
  };

  const togglePageSelection = () => {
    setAllFilteredSelected(false);

    if (pageFullySelected) {
      setSelectedRecordIds((current) =>
        current.filter((recordId) => !selectablePageIds.includes(recordId))
      );
      return;
    }

    setSelectedRecordIds((current) => [
      ...new Set([...current, ...selectablePageIds]),
    ]);
  };

  const applyQuickFilter = (filter: RecordSelectionQuickFilter) => {
    setActiveQuickFilterId(filter.id);
    setDepartmentFilter(filter.department ?? "alle");
    setSourceFilter(filter.source ?? "alle");
    setStatusFilter(filter.status ?? "alle");
    setSearch("");
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setDepartmentFilter("alle");
    setSourceFilter("alle");
    setStatusFilter("alle");
    setSortBy("destroyable-since");
    setActiveQuickFilterId(null);
    setCurrentPage(1);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isTyping =
        tagName === "INPUT" || tagName === "TEXTAREA" || target?.isContentEditable;

      if (isTyping) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "w") {
        event.preventDefault();
        handlePrimaryAction();
      }

      if (key === "escape" && selectedCount > 0) {
        event.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allFilteredSelected, id, selectedAction, selectedCount, taakId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ContentPanel>
          <ContentPanelBody>
            <ContentPanelHeader
              eyebrow="Taakuitvoering"
              title="Selectie"
              subtitle="Stel de vernietigingsset samen op basis van filters, sortering en bulkselectie. Recorddetails blijven beschikbaar als context, maar de hoofdtaak is het vormen van een betrouwbare selectie op schaal."
            />

            <TaskExecutionContextBar
              activeStep="SELECTIE"
              items={recordSelectionTaskMetaItems}
            />

            <ContentPanelStatGrid>
              <ContentPanelStat
                label="Gevonden records"
                value={String(filteredRecords.length)}
                hint="Binnen de huidige filters en zoekopdracht."
                icon={<Search size={16} />}
              />
              <ContentPanelStat
                label="Direct selecteerbaar"
                value={String(directSelectableCount)}
                hint="Records zonder aanvullende blokkades."
                icon={<CheckCheck size={16} />}
              />
              <ContentPanelStat
                label="Controle nodig"
                value={String(attentionCount)}
                hint="Nog te beoordelen voordat bulkactie logisch voelt."
                icon={<Eye size={16} />}
              />
              <ContentPanelStat
                label="Uitgesloten"
                value={String(excludedCount)}
                hint="Niet beschikbaar voor de bulkselectie."
                icon={<Trash2 size={16} />}
              />
            </ContentPanelStatGrid>

            <ContentPanelSection
              title="Records"
              description="Gebruik zoeken, filters en sortering om een grote set records snel te verfijnen en daarna in bulk te selecteren."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Filters wissen
                </button>
              }
            >
              <div className="space-y-4">
                <div className="rounded-md border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Zoeken
                      </span>
                      <div className="relative mt-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={search}
                          onChange={(event) => {
                            setSearch(event.target.value);
                            setCurrentPage(1);
                            setActiveQuickFilterId(null);
                          }}
                          placeholder="Zoek op record, zaaktype, afdeling of bron"
                          className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </label>

                    <FilterSelect
                      label="Afdeling"
                      value={departmentFilter}
                      icon={<SlidersHorizontal size={16} />}
                      onChange={(value) => {
                        setDepartmentFilter(value);
                        setCurrentPage(1);
                        setActiveQuickFilterId(null);
                      }}
                      options={departments}
                    />

                    <FilterSelect
                      label="Bron"
                      value={sourceFilter}
                      icon={<Columns3 size={16} />}
                      onChange={(value) => {
                        setSourceFilter(value);
                        setCurrentPage(1);
                        setActiveQuickFilterId(null);
                      }}
                      options={sources}
                    />

                    <FilterSelect
                      label="Status"
                      value={statusFilter}
                      icon={<CheckCheck size={16} />}
                      onChange={(value) => {
                        setStatusFilter(value);
                        setCurrentPage(1);
                        setActiveQuickFilterId(null);
                      }}
                      options={["alle", "selecteerbaar", "controle-nodig", "uitgesloten"]}
                    />

                    <FilterSelect
                      label="Sorteren"
                      value={sortBy}
                      icon={<ArrowUpDown size={16} />}
                      onChange={(value) => setSortBy(value as RecordSelectionSortOption["id"])}
                      options={recordSelectionSortOptions.map((option) => option.id)}
                      labels={Object.fromEntries(
                        recordSelectionSortOptions.map((option) => [option.id, option.label])
                      )}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {recordSelectionQuickFilters.map((filter) => {
                      const active = activeQuickFilterId === filter.id;

                      return (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => applyQuickFilter(filter)}
                          className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                            active
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {filteredRecords.length} records gevonden
                    </span>
                    <span className="text-sm text-slate-500">
                      {selectionScopeLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeQuickFilterId && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Snelfilter:{" "}
                        {
                          recordSelectionQuickFilters.find(
                            (filter) => filter.id === activeQuickFilterId
                          )?.label
                        }
                      </span>
                    )}
                    {departmentFilter !== "alle" && (
                      <FilterChip label={`Afdeling: ${departmentFilter}`} />
                    )}
                    {sourceFilter !== "alle" && (
                      <FilterChip label={`Bron: ${sourceFilter}`} />
                    )}
                    {statusFilter !== "alle" && (
                      <FilterChip
                        label={`Status: ${
                          statusFilter === "controle-nodig"
                            ? "controle nodig"
                            : statusFilter
                        }`}
                      />
                    )}
                  </div>
                </div>

                {savedSelectionMessage && (
                  <div className="rounded-md border border-green-200 bg-green-50/80 px-4 py-3 text-sm text-green-800">
                    {savedSelectionMessage}
                  </div>
                )}

                {selectedCount > 0 && (
                  <div className="rounded-md border border-blue-200 bg-blue-50/70 px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-blue-900">
                          {allFilteredSelected
                            ? `Alle ${selectedCount} gefilterde records zijn geselecteerd`
                            : `${selectedCount} records geselecteerd`}
                        </div>
                        <div className="mt-1 text-sm text-blue-700">
                          {allFilteredSelected
                            ? "De bulkactie werkt straks op de volledige gefilterde set, niet alleen op de huidige pagina."
                            : `Op deze pagina zijn ${selectedPageCount} records meegenomen in de selectie.`}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!allFilteredSelected && filteredSelectableIds.length > selectedCount && (
                          <button
                            type="button"
                            onClick={() => {
                              setAllFilteredSelected(true);
                              setSelectedRecordIds([]);
                            }}
                            className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                          >
                            Selecteer alle {filteredSelectableIds.length} selecteerbare records
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={clearSelection}
                          className="rounded-md border border-transparent px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                        >
                          Selectie wissen
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-4 py-3">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={pageFullySelected}
                        onChange={togglePageSelection}
                        disabled={selectablePageIds.length === 0}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Selecteer huidige pagina
                    </label>

                    <div className="text-sm text-slate-500">
                      Pagina {currentPage} van {pageCount}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-white">
                        <tr className="text-left">
                          <th className="w-14 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Selectie
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Record
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Afdeling
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Bron
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Vernietigbaar sinds
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagedRecords.map((record) => {
                          const selectable = isRecordSelectable(record);
                          const checked = allFilteredSelected || selectedRecordIds.includes(record.id);

                          return (
                            <tr
                              key={record.id}
                              className={checked ? "bg-blue-50/40" : "bg-white"}
                            >
                              <td className="px-4 py-4 align-top">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleRecord(record.id)}
                                  disabled={!selectable}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm font-semibold text-slate-900">
                                      {record.title}
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                      {record.recordType}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    {record.description}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-400">
                                    {record.id} | {record.caseType} | bewaartermijn{" "}
                                    {record.retentionPeriodYears} jaar
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-700">
                                {record.department}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-700">
                                {record.source}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-700">
                                {record.destroyableSince}
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge status={getStatusBadge(record)} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-500">
                      {selectedCount > 0
                        ? `${selectedCount} records klaar voor de volgende stap`
                        : "Selecteer records om een bulkactie te starten"}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                        Vorige
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((page) => Math.min(pageCount, page + 1))
                        }
                        disabled={currentPage === pageCount}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Volgende
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ContentPanelSection>
          </ContentPanelBody>
        </ContentPanel>

        <ActionPanel
          title="Selectiecontext"
          subtitle="Hier blijft zichtbaar waar de selectie op gebaseerd is en wat de volgende bulkstap betekent."
          footer={
            <div className="space-y-2.5">
              <ActionPanelButtonGroup>
                <ActionPanelButton
                  label={
                    selectedAction === "selectie-opslaan"
                      ? "Selectie opslaan"
                      : selectedCount <= 1
                        ? "Naar beoordeling"
                        : "Bulkactie uitvoeren"
                  }
                  variant="primary"
                  disabled={!canRunPrimaryAction}
                  onClick={handlePrimaryAction}
                />
                <ActionPanelButton
                  label={selectedCount > 0 ? "Selectie wissen" : "Nog geen selectie"}
                  variant="secondary"
                  disabled={selectedCount === 0}
                  onClick={handleSecondaryAction}
                />
              </ActionPanelButtonGroup>

              <ActionPanelShortcuts
                shortcuts={[
                  { keyLabel: "W", label: "Primaire actie" },
                  { keyLabel: "Esc", label: "Selectie wissen" },
                ]}
              />
            </div>
          }
        >
          <ActionPanelSummary
            eyebrow="Overzicht"
            title={
              selectedCount > 0
                ? `${selectedCount} records in selectie`
                : "Nog geen actieve selectie"
            }
            items={[
              { label: "Gevonden", value: String(filteredRecords.length) },
              { label: "Selecteerbaar", value: String(filteredSelectableIds.length) },
              { label: "Selectie", value: selectionScopeLabel },
              {
                label: "Snelfilter",
                value:
                  recordSelectionQuickFilters.find(
                    (filter) => filter.id === activeQuickFilterId
                  )?.label ?? "Geen",
              },
            ]}
          />

          <ActionPanelSection
            title="Beschikbare acties"
            description="De bulkactie wordt pas betekenisvol zodra er een expliciete selectie is gemaakt."
          >
            <div className="space-y-3">
              <ActionPanelChoice
                title={selectedCount <= 1 ? "Naar beoordeling" : "Bulkbeoordeling starten"}
                description="Open de volgende stap voor de huidige selectie."
                icon={<CheckCheck size={18} />}
                tone="primary"
                density="compact"
                selected={selectedAction === "bulk-beoordelen"}
                onClick={() => setSelectedAction("bulk-beoordelen")}
              />

              <ActionPanelChoice
                title="Selectie opslaan"
                description="Bewaar de huidige filterset en selectie als uitgangspunt."
                icon={<Save size={18} />}
                tone="neutral"
                density="compact"
                selected={selectedAction === "selectie-opslaan"}
                onClick={() => setSelectedAction("selectie-opslaan")}
              />
            </div>
          </ActionPanelSection>

          <ActionPanelSection
            title="Context"
            description="De inhoud verschuift mee met de selectie: van algemene uitleg naar detail of bulkimpact."
          >
            {selectedRecord ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedRecord.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {selectedRecord.id} | {selectedRecord.recordType}
                    </div>
                  </div>
                  <StatusBadge status={getStatusBadge(selectedRecord)} />
                </div>

                <dl className="mt-4 grid gap-3">
                  <SummaryLine label="Afdeling" value={selectedRecord.department} />
                  <SummaryLine label="Proceseigenaar" value={selectedRecord.processOwner} />
                  <SummaryLine label="Archivaris" value={selectedRecord.archivist} />
                  <SummaryLine
                    label="Vernietigbaar sinds"
                    value={selectedRecord.destroyableSince}
                  />
                  <SummaryLine label="Bron" value={selectedRecord.source} />
                  <SummaryLine label="Context" value={selectedRecord.description} />
                </dl>
              </div>
            ) : selectedCount > 1 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">
                  Bulkselectie op schaal
                </p>
                <p className="mt-2">
                  Deze selectie is geschikt om als set te beoordelen of op te slaan.
                  De focus ligt nu op de scope van de selectie, niet op de metadata van
                  een record.
                </p>
                <dl className="mt-4 grid gap-3">
                  <SummaryLine label="Selectievorm" value={selectionScopeLabel} />
                  <SummaryLine
                    label="Actieve filters"
                    value={
                      [departmentFilter, sourceFilter, statusFilter]
                        .filter((value) => value !== "alle")
                        .join(" | ") || "Alle records"
                    }
                  />
                  <SummaryLine
                    label="Impact"
                    value={
                      allFilteredSelected
                        ? "Bulkactie raakt de volledige gefilterde set."
                        : "Bulkactie raakt alleen de expliciet aangevinkte records."
                    }
                  />
                </dl>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Nog geen record gekozen</p>
                <p className="mt-2">
                  Gebruik filters en checkbox-selectie om een subset samen te stellen.
                  Zodra je een record kiest, tonen we hier compacte metadata. Bij meerdere
                  records verschuift dit paneel naar een bulkoverzicht.
                </p>
              </div>
            )}
          </ActionPanelSection>

          <ActionPanelSection
            title="Snelfilters"
            description="Voor veelvoorkomende scenario's kun je direct een bekende filterset activeren."
          >
            <div className="space-y-2">
              {recordSelectionQuickFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => applyQuickFilter(filter)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    activeQuickFilterId === filter.id
                      ? "border-blue-200 bg-blue-50/80"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {filter.label}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {filter.description}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {getQuickFilterCopy(filter)}
                  </div>
                </button>
              ))}
            </div>
          </ActionPanelSection>
        </ActionPanel>
      </div>
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
      {label}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  icon,
  options,
  onChange,
  labels = {},
}: {
  label: string;
  value: string;
  icon: ReactNode;
  options: string[];
  onChange: (value: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <div className="relative mt-2">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {labels[option] ?? option}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-700">{value}</dd>
    </div>
  );
}
