'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Copy,
  Download,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  InternalSignupAttributionBreakdownResponse,
  InternalSignupAttributionGroupBy,
  InternalSignupAttributionOverview,
  InternalSignupAttributionUserRow,
  InternalSignupAttributionUsersResponse,
  InternalSignupLinkTemplate,
} from '@/types';
import { apiService } from '@/services/api';
import {
  DEFAULT_TEMPLATE_DESTINATION,
  POST_SHARE_DESTINATION,
  TEMPLATE_DESTINATION_PRESETS,
  buildTemplateRelativePath,
  buildTemplateUrl,
  isPostShareTemplate,
} from '@/lib/attribution/attribution-links';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorState } from './error-state';
import { PAGE_SIZE, formatDate } from './internal-utils';
import {
  SectionHeader,
  Panel,
  StatStrip,
  Stat,
  StatusPill,
  DataTable,
  Toolbar,
  SegmentedControl,
  Pagination,
  type Column,
} from './kit';

const UNATTRIBUTED_FILTER_VALUE = '__unattributed__';
const DEFAULT_TEMPLATE_FORM = {
  name: '',
  description: '',
  source: '',
  medium: '',
  campaign: '',
  destinationPath: DEFAULT_TEMPLATE_DESTINATION,
  isActive: true,
};

type PresetRange = '7d' | '30d' | '90d' | 'all';
type AttributionSubview = 'reporting' | 'templates';
type BreakdownSelection = {
  groupBy: InternalSignupAttributionGroupBy;
  value?: string | null;
  key: string;
  isUnattributed: boolean;
};
type TemplateFormState = typeof DEFAULT_TEMPLATE_FORM;

// Synthetic row shape for DataTable
type BreakdownRow = {
  key: string;
  value?: string | null;
  signups: number;
  percentOfFilteredTotal: number;
  isUnattributed: boolean;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildPresetDates(preset: PresetRange) {
  const today = new Date();
  const end = toDateInputValue(today);
  if (preset === 'all') return { from: '', to: '' };
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return { from: toDateInputValue(start), to: end };
}

function toApiDate(value: string, endOfDay = false) {
  if (!value) return undefined;
  return endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`;
}

function normalizePresetDestination(path?: string | null) {
  const value = path || DEFAULT_TEMPLATE_DESTINATION;
  return TEMPLATE_DESTINATION_PRESETS.some((preset) => preset.value === value)
    ? value
    : DEFAULT_TEMPLATE_DESTINATION;
}

/* ────────────────────────────── Main Component ────────────────────────────── */

export function AttributionTab() {
  const [activeView, setActiveView] = useState<AttributionSubview>('reporting');

  const [presetRange, setPresetRange] = useState<PresetRange>('30d');
  const [fromDate, setFromDate] = useState(() => buildPresetDates('30d').from);
  const [toDate, setToDate] = useState(() => buildPresetDates('30d').to);
  const [sourceFilter, setSourceFilter] = useState('');
  const [mediumFilter, setMediumFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [contentFilter, setContentFilter] = useState('');
  const [referrerDomainFilter, setReferrerDomainFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [groupBy, setGroupBy] = useState<InternalSignupAttributionGroupBy>('source');
  const [breakdownPage, setBreakdownPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [selectedBreakdown, setSelectedBreakdown] = useState<BreakdownSelection | null>(null);

  const [overview, setOverview] = useState<InternalSignupAttributionOverview | null>(null);
  const [breakdown, setBreakdown] = useState<InternalSignupAttributionBreakdownResponse | null>(null);
  const [users, setUsers] = useState<InternalSignupAttributionUsersResponse | null>(null);
  const [reportingLoading, setReportingLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [reportingError, setReportingError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [exportingBreakdown, setExportingBreakdown] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);

  const [templates, setTemplates] = useState<InternalSignupLinkTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(DEFAULT_TEMPLATE_FORM);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const appOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://www.cassette.tech';

  const baseReportingParams = useMemo(
    () => ({
      from: toApiDate(fromDate, false),
      to: toApiDate(toDate, true),
      source: sourceFilter.trim() || undefined,
      medium: mediumFilter.trim() || undefined,
      campaign: campaignFilter.trim() || undefined,
      content: contentFilter.trim() || undefined,
      referrerDomain: referrerDomainFilter.trim() || undefined,
    }),
    [fromDate, toDate, sourceFilter, mediumFilter, campaignFilter, contentFilter, referrerDomainFilter]
  );

  const usersParams = useMemo(() => {
    const params = {
      ...baseReportingParams,
      q: userSearch.trim() || undefined,
    };
    if (!selectedBreakdown) return params;
    const filterValue = selectedBreakdown.isUnattributed
      ? UNATTRIBUTED_FILTER_VALUE
      : selectedBreakdown.value ?? undefined;
    if (selectedBreakdown.groupBy === 'source') return { ...params, source: filterValue };
    if (selectedBreakdown.groupBy === 'medium') return { ...params, medium: filterValue };
    if (selectedBreakdown.groupBy === 'campaign') return { ...params, campaign: filterValue };
    if (selectedBreakdown.groupBy === 'content') return { ...params, content: filterValue };
    return { ...params, referrerDomain: filterValue };
  }, [baseReportingParams, selectedBreakdown, userSearch]);

  const templatePreview = useMemo(
    () => buildTemplateUrl(appOrigin, templateForm),
    [appOrigin, templateForm]
  );

  const isPostTemplateForm = templateForm.destinationPath === POST_SHARE_DESTINATION;

  // Illustrates what the Share menu copies for a post template; the real link is
  // built per post via buildAttributedPostPath.
  const postSharePreviewPath = useMemo(() => {
    const parts = [`src=${templateForm.source.trim() || '<source>'}`];
    if (templateForm.medium.trim()) parts.push(`utm_medium=${templateForm.medium.trim()}`);
    if (templateForm.campaign.trim()) parts.push(`utm_campaign=${templateForm.campaign.trim()}`);
    parts.push('utm_content=post-{id}');
    return `/post/{id}?${parts.join('&')}`;
  }, [templateForm.source, templateForm.medium, templateForm.campaign]);

  // ─── Data loaders ─────────────────────────────────────────────────
  const loadReporting = useCallback(async () => {
    setReportingLoading(true);
    setReportingError(null);
    try {
      const [nextOverview, nextBreakdown] = await Promise.all([
        apiService.getInternalSignupAttributionOverview(baseReportingParams),
        apiService.getInternalSignupAttributionBreakdown({
          ...baseReportingParams,
          groupBy,
          page: breakdownPage,
          pageSize: PAGE_SIZE,
        }),
      ]);
      setOverview(nextOverview);
      setBreakdown(nextBreakdown);
    } catch (error) {
      setReportingError(error instanceof Error ? error.message : 'Failed to load attribution reporting');
    } finally {
      setReportingLoading(false);
    }
  }, [baseReportingParams, breakdownPage, groupBy]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const nextUsers = await apiService.getInternalSignupAttributionUsers({
        ...usersParams,
        page: usersPage,
        pageSize: PAGE_SIZE,
      });
      setUsers(nextUsers);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Failed to load attributed users');
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, usersParams]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const items = await apiService.getInternalSignupLinkTemplates();
      setTemplates(items);
    } catch (error) {
      setTemplatesError(error instanceof Error ? error.message : 'Failed to load signup link templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => { void loadReporting(); }, [loadReporting]);
  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => { void loadTemplates(); }, [loadTemplates]);

  useEffect(() => {
    setSelectedBreakdown(null);
    setUsersPage(1);
  }, [groupBy, baseReportingParams]);

  // ─── Handlers ─────────────────────────────────────────────────────
  const handlePresetChange = (value: PresetRange) => {
    setPresetRange(value);
    const nextRange = buildPresetDates(value);
    setFromDate(nextRange.from);
    setToDate(nextRange.to);
    setBreakdownPage(1);
    setUsersPage(1);
  };

  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    setPresetRange('all');
    if (field === 'from') setFromDate(value);
    else setToDate(value);
    setBreakdownPage(1);
    setUsersPage(1);
  };

  const handleSelectBreakdownRow = (row: BreakdownSelection) => {
    setUsersPage(1);
    setSelectedBreakdown((current) =>
      current?.groupBy === row.groupBy &&
      current.value === row.value &&
      current.isUnattributed === row.isUnattributed
        ? null
        : row
    );
  };

  const downloadBlob = (blob: Blob, filenamePrefix: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportBreakdown = async () => {
    setExportingBreakdown(true);
    try {
      const blob = await apiService.exportInternalSignupAttributionCsv({ view: 'breakdown', groupBy, ...baseReportingParams });
      downloadBlob(blob, `internal-signup-attribution-breakdown-${groupBy}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export breakdown CSV');
    } finally {
      setExportingBreakdown(false);
    }
  };

  const handleExportUsers = async () => {
    setExportingUsers(true);
    try {
      const blob = await apiService.exportInternalSignupAttributionCsv({ view: 'users', ...usersParams });
      downloadBlob(blob, 'internal-signup-attribution-users');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export users CSV');
    } finally {
      setExportingUsers(false);
    }
  };

  const resetTemplateForm = () => {
    setEditingTemplateId(null);
    setTemplateForm(DEFAULT_TEMPLATE_FORM);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.source.trim()) {
      toast.error('Template name and source are required.');
      return;
    }
    setSavingTemplate(true);
    try {
      const payload = {
        name: templateForm.name.trim(),
        description: templateForm.description.trim(),
        source: templateForm.source.trim(),
        medium: templateForm.medium.trim(),
        campaign: templateForm.campaign.trim(),
        destinationPath: templateForm.destinationPath.trim(),
        isActive: templateForm.isActive,
      };
      if (editingTemplateId) {
        await apiService.updateInternalSignupLinkTemplate(editingTemplateId, payload);
        toast.success('Signup link template updated.');
      } else {
        await apiService.createInternalSignupLinkTemplate(payload);
        toast.success('Signup link template created.');
      }
      resetTemplateForm();
      await loadTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save signup link template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleEditTemplate = (template: InternalSignupLinkTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      description: template.description ?? '',
      source: template.source,
      medium: template.medium ?? '',
      campaign: template.campaign ?? '',
      destinationPath: normalizePresetDestination(template.destinationPath),
      isActive: template.isActive,
    });
  };

  const handleDuplicateTemplate = (template: InternalSignupLinkTemplate) => {
    setEditingTemplateId(null);
    setTemplateForm({
      name: `${template.name} Copy`,
      description: template.description ?? '',
      source: template.source,
      medium: template.medium ?? '',
      campaign: template.campaign ?? '',
      destinationPath: normalizePresetDestination(template.destinationPath),
      isActive: template.isActive,
    });
  };

  const handleDeleteTemplate = async (template: InternalSignupLinkTemplate) => {
    const confirmed = window.confirm(`Delete "${template.name}"?`);
    if (!confirmed) return;
    setDeletingTemplateId(template.id);
    try {
      await apiService.deleteInternalSignupLinkTemplate(template.id);
      toast.success('Signup link template deleted.');
      if (editingTemplateId === template.id) resetTemplateForm();
      await loadTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete signup link template');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const handleCopyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}.`);
    }
  };

  const hasAttributionFilters = sourceFilter || mediumFilter || campaignFilter || contentFilter || referrerDomainFilter;

  // ─── Column definitions ────────────────────────────────────────────

  const breakdownColumns: Column<BreakdownRow>[] = [
    {
      key: 'key',
      header: groupBy,
      cell: (row) => (
        <span className="font-medium text-foreground">
          {row.key}
          {row.isUnattributed && (
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">[none]</span>
          )}
        </span>
      ),
    },
    {
      key: 'signups',
      header: 'Signups',
      align: 'right',
      className: 'w-[80px]',
      cell: (row) => (
        <span className="font-mono tabular-nums">{row.signups.toLocaleString()}</span>
      ),
    },
    {
      key: 'pct',
      header: '% total',
      align: 'right',
      className: 'w-[110px]',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-domain transition-all"
              style={{ width: `${Math.min(row.percentOfFilteredTotal, 100)}%` }}
            />
          </div>
          <span className="font-mono tabular-nums text-muted-foreground w-[44px] text-right">
            {row.percentOfFilteredTotal.toFixed(1)}%
          </span>
        </div>
      ),
    },
  ];

  const usersColumns: Column<InternalSignupAttributionUserRow>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.username}</p>
          <p className="text-[11px] text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      className: 'hidden md:table-cell w-[100px]',
      cell: (row) => (
        <span className="font-mono tabular-nums text-muted-foreground whitespace-nowrap">
          {formatDate(row.joinDate)}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      className: 'hidden sm:table-cell',
      cell: (row) =>
        row.signupSource ? (
          <span className="font-mono text-[11px] text-foreground">{row.signupSource}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
    {
      key: 'medium',
      header: 'Medium',
      className: 'hidden lg:table-cell',
      cell: (row) =>
        row.signupMedium ? (
          <span className="font-mono text-[11px] text-foreground">{row.signupMedium}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
    {
      key: 'campaign',
      header: 'Campaign',
      className: 'hidden xl:table-cell',
      cell: (row) =>
        row.signupCampaign ? (
          <span className="font-mono text-[11px] text-foreground">{row.signupCampaign}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
    {
      key: 'content',
      header: 'Content',
      className: 'hidden xl:table-cell',
      cell: (row) =>
        row.signupContent ? (
          <span className="font-mono text-[11px] text-foreground">{row.signupContent}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
  ];

  const breakdownRows: BreakdownRow[] = breakdown?.items ?? [];

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <SectionHeader
        section="Growth"
        title="Attribution"
        actions={
          <SegmentedControl<AttributionSubview>
            value={activeView}
            onChange={setActiveView}
            options={[
              { value: 'reporting', label: 'Reporting' },
              { value: 'templates', label: 'Link Templates' },
            ]}
          />
        }
      />

      {/* ─────────────────── REPORTING TAB ─────────────────── */}
      {activeView === 'reporting' && (
        <div className="space-y-4">
          {/* Filters toolbar */}
          <Panel title="Filters">
            <div className="space-y-2 px-3 py-2.5">
              {/* Date presets + custom range */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Range</span>
                <SegmentedControl<PresetRange>
                  value={presetRange}
                  onChange={handlePresetChange}
                  options={[
                    { value: '7d', label: 'Last 7d' },
                    { value: '30d', label: 'Last 30d' },
                    { value: '90d', label: 'Last 90d' },
                    { value: 'all', label: 'All time' },
                  ]}
                />
                <div className="flex items-center gap-1.5 ml-auto">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => handleCustomDateChange('from', e.target.value)}
                    className="h-7 w-[130px] text-xs"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => handleCustomDateChange('to', e.target.value)}
                    className="h-7 w-[130px] text-xs"
                  />
                </div>
              </div>

              {/* Dimension filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Dims</span>
                {[
                  { value: sourceFilter, onChange: setSourceFilter, placeholder: 'Source' },
                  { value: mediumFilter, onChange: setMediumFilter, placeholder: 'Medium' },
                  { value: campaignFilter, onChange: setCampaignFilter, placeholder: 'Campaign' },
                  { value: contentFilter, onChange: setContentFilter, placeholder: 'Content' },
                  { value: referrerDomainFilter, onChange: setReferrerDomainFilter, placeholder: 'Referrer' },
                ].map((f) => (
                  <div key={f.placeholder} className="relative">
                    <Input
                      value={f.value}
                      onChange={(e) => {
                        f.onChange(e.target.value);
                        setBreakdownPage(1);
                        setUsersPage(1);
                      }}
                      placeholder={f.placeholder}
                      className="h-7 w-[110px] text-xs pl-2 pr-6"
                    />
                    {f.value && (
                      <button
                        onClick={() => { f.onChange(''); setBreakdownPage(1); setUsersPage(1); }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {hasAttributionFilters && (
                  <button
                    onClick={() => {
                      setSourceFilter('');
                      setMediumFilter('');
                      setCampaignFilter('');
                      setContentFilter('');
                      setReferrerDomainFilter('');
                      setBreakdownPage(1);
                      setUsersPage(1);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadReporting()}
                  disabled={reportingLoading}
                  className="ml-auto h-7 text-xs gap-1.5"
                >
                  <RefreshCw className={`h-3 w-3 ${reportingLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </Panel>

          {reportingError && <ErrorState message={reportingError} onRetry={() => void loadReporting()} />}

          {/* Stats strip */}
          <StatStrip>
            <Stat label="Total Signups" value={overview?.totalSignups ?? 0} hint="Filtered window" />
            <Stat label="Attributed" value={overview?.attributedSignups ?? 0} tone="success" hint="With attribution" />
            <Stat label="Unattributed" value={overview?.unattributedSignups ?? 0} tone="warning" hint="No attribution" />
            <Stat label="Sources" value={overview?.uniqueSources ?? 0} tone="domain" />
            <Stat label="Campaigns" value={overview?.uniqueCampaigns ?? 0} tone="domain" />
            <Stat label="Media" value={overview?.uniqueMedia ?? 0} tone="domain" />
          </StatStrip>

          {/* Breakdown + Users side by side */}
          <div className="grid gap-4 xl:grid-cols-2">
            {/* Breakdown */}
            <Panel
              title="Breakdown"
              actions={
                <div className="flex items-center gap-1.5">
                  <Select
                    value={groupBy}
                    onValueChange={(value: InternalSignupAttributionGroupBy) => {
                      setGroupBy(value);
                      setBreakdownPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="source">by source</SelectItem>
                      <SelectItem value="medium">by medium</SelectItem>
                      <SelectItem value="campaign">by campaign</SelectItem>
                      <SelectItem value="content">by content</SelectItem>
                      <SelectItem value="referrerDomain">by referrer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => void handleExportBreakdown()}
                    disabled={reportingLoading || exportingBreakdown}
                  >
                    <Download className="h-3 w-3" />
                    CSV
                  </Button>
                </div>
              }
            >
              <DataTable<BreakdownRow>
                columns={breakdownColumns}
                rows={breakdownRows}
                rowKey={(row) => `${row.key}-${row.value ?? 'null'}`}
                isLoading={reportingLoading}
                skeletonRows={5}
                selectedKey={
                  selectedBreakdown
                    ? `${selectedBreakdown.key}-${selectedBreakdown.value ?? 'null'}`
                    : null
                }
                onRowClick={(row) =>
                  handleSelectBreakdownRow({
                    groupBy,
                    key: row.key,
                    value: row.value,
                    isUnattributed: row.isUnattributed,
                  })
                }
                empty={{
                  icon: BarChart3,
                  title: 'No breakdown data',
                  description: 'No signups match the current attribution filters.',
                }}
                renderMobile={(row) => (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{row.key}</span>
                    <span className="font-mono tabular-nums text-xs text-muted-foreground">
                      {row.signups.toLocaleString()} · {row.percentOfFilteredTotal.toFixed(1)}%
                    </span>
                  </div>
                )}
              />
              <Pagination
                page={breakdown?.page ?? breakdownPage}
                totalPages={breakdown?.totalPages ?? 1}
                totalItems={breakdown?.totalItems ?? 0}
                itemLabel="groups"
                isLoading={reportingLoading}
                onPageChange={setBreakdownPage}
              />
            </Panel>

            {/* Users drilldown */}
            <Panel
              title="Signup Users"
              actions={
                <div className="flex items-center gap-1.5">
                  {selectedBreakdown && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="font-mono text-foreground">{selectedBreakdown.key}</span>
                      <button
                        onClick={() => setSelectedBreakdown(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => void handleExportUsers()}
                    disabled={usersLoading || exportingUsers}
                  >
                    <Download className="h-3 w-3" />
                    CSV
                  </Button>
                </div>
              }
            >
              <div className="px-3 py-2 border-b border-border">
                <Toolbar
                  search={userSearch}
                  onSearchChange={(v) => { setUserSearch(v); setUsersPage(1); }}
                  searchPlaceholder="Search username, email, or attribution…"
                />
              </div>

              {usersError && (
                <div className="px-3 py-2">
                  <ErrorState message={usersError} onRetry={() => void loadUsers()} />
                </div>
              )}

              <DataTable<InternalSignupAttributionUserRow>
                columns={usersColumns}
                rows={users?.items ?? []}
                rowKey={(row) => row.userId}
                isLoading={usersLoading}
                skeletonRows={5}
                empty={{
                  icon: Users,
                  title: 'No users found',
                  description: 'No completed signups match the current drilldown.',
                }}
                renderMobile={(row) => (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">{row.username}</p>
                    <p className="text-[11px] text-muted-foreground">{row.email}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{formatDate(row.joinDate)}</p>
                  </div>
                )}
              />
              <Pagination
                page={users?.page ?? usersPage}
                totalPages={users?.totalPages ?? 1}
                totalItems={users?.totalItems ?? 0}
                itemLabel="users"
                isLoading={usersLoading}
                onPageChange={setUsersPage}
              />
            </Panel>
          </div>
        </div>
      )}

      {/* ─────────────────── TEMPLATES TAB ─────────────────── */}
      {activeView === 'templates' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Template list */}
          <Panel
            title="Saved Templates"
            actions={
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => void loadTemplates()}
                disabled={templatesLoading}
              >
                <RefreshCw className={`h-3 w-3 ${templatesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            }
          >
            {templatesError && (
              <div className="px-3 py-2">
                <ErrorState message={templatesError} onRetry={() => void loadTemplates()} />
              </div>
            )}

            {!templates.length && !templatesLoading ? (
              <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center">
                <Link2 className="h-5 w-5 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">No saved templates</p>
                <p className="text-xs text-muted-foreground">Create a reusable signup link template to get started.</p>
              </div>
            ) : templatesLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3">
                    <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                    <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {templates.map((template) => {
                  const url = buildTemplateUrl(appOrigin, template);
                  const isEditing = editingTemplateId === template.id;
                  return (
                    <div
                      key={template.id}
                      className={`group px-3 py-2.5 transition-colors hover:bg-muted/30 ${
                        isEditing ? 'bg-domain/[0.04]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-foreground truncate">{template.name}</p>
                            <StatusPill
                              tone={template.isActive ? 'success' : 'neutral'}
                              label={template.isActive ? 'Active' : 'Inactive'}
                            />
                          </div>
                          {template.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {isPostShareTemplate(template)
                                ? 'post share'
                                : template.destinationPath || DEFAULT_TEMPLATE_DESTINATION}
                            </span>
                            {template.source && (
                              <span className="font-mono text-[10px] text-muted-foreground">{template.source}</span>
                            )}
                            {template.medium && (
                              <span className="font-mono text-[10px] text-muted-foreground">{template.medium}</span>
                            )}
                            {template.campaign && (
                              <span className="font-mono text-[10px] text-muted-foreground">{template.campaign}</span>
                            )}
                          </div>
                        </div>
                        <TooltipProvider delayDuration={200}>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isPostShareTemplate(template) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void handleCopyText(url, 'URL')}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom"><p className="text-xs">Copy URL</p></TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditTemplate(template)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom"><p className="text-xs">Edit</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicateTemplate(template)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom"><p className="text-xs">Duplicate</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  disabled={deletingTemplateId === template.id}
                                  onClick={() => void handleDeleteTemplate(template)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom"><p className="text-xs">Delete</p></TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground mt-1.5 truncate rounded bg-muted px-1.5 py-0.5">
                        {isPostShareTemplate(template) ? 'Copied from the Share menu on any post page' : url}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Template form */}
          <Panel
            title={editingTemplateId ? 'Edit Template' : 'New Template'}
            bodyClassName="space-y-3 px-3 py-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="template-name" className="text-xs">Name</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="Instagram paid social"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-description" className="text-xs">Description</Label>
              <Textarea
                id="template-description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm((c) => ({ ...c, description: e.target.value }))}
                placeholder="Optional note about when to use this link"
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <div className="grid gap-2 grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="template-source" className="text-xs">Source *</Label>
                <Input
                  id="template-source"
                  value={templateForm.source}
                  onChange={(e) => setTemplateForm((c) => ({ ...c, source: e.target.value }))}
                  placeholder="instagram"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="template-medium" className="text-xs">Medium</Label>
                <Input
                  id="template-medium"
                  value={templateForm.medium}
                  onChange={(e) => setTemplateForm((c) => ({ ...c, medium: e.target.value }))}
                  placeholder="paid-social"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-campaign" className="text-xs">Campaign</Label>
              <Input
                id="template-campaign"
                value={templateForm.campaign}
                onChange={(e) => setTemplateForm((c) => ({ ...c, campaign: e.target.value }))}
                placeholder="spring-drop-2026"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-destination" className="text-xs">Destination</Label>
              <Select
                value={normalizePresetDestination(templateForm.destinationPath)}
                onValueChange={(value) => setTemplateForm((c) => ({ ...c, destinationPath: value }))}
              >
                <SelectTrigger id="template-destination" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_DESTINATION_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isPostTemplateForm && (
                <p className="text-[11px] text-muted-foreground">
                  Post templates appear in the Share menu on every post page. The copied link points at that post
                  and tags it automatically.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">Active</p>
                <p className="text-[10px] text-muted-foreground">Inactive templates stay saved but are hidden.</p>
              </div>
              <Switch
                checked={templateForm.isActive}
                onCheckedChange={(checked) => setTemplateForm((c) => ({ ...c, isActive: checked }))}
              />
            </div>

            <Separator />

            {/* URL preview */}
            <div className="space-y-1.5">
              <Label className="text-xs">Live Preview</Label>
              <div className="rounded border border-border bg-muted px-2.5 py-2">
                <p className="break-all font-mono text-[11px] leading-relaxed text-foreground">
                  {isPostTemplateForm ? postSharePreviewPath : templatePreview}
                </p>
              </div>
              {!isPostTemplateForm && (
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 flex-1"
                    onClick={() => void handleCopyText(templatePreview, 'Full URL')}
                  >
                    <Copy className="h-3 w-3" />
                    Copy URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 flex-1"
                    onClick={() => void handleCopyText(buildTemplateRelativePath(templateForm), 'Path')}
                  >
                    <Copy className="h-3 w-3" />
                    Copy path
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={() => void handleSaveTemplate()} disabled={savingTemplate} className="flex-1 h-8 text-xs">
                {editingTemplateId ? 'Update template' : 'Create template'}
              </Button>
              <Button variant="outline" onClick={resetTemplateForm} disabled={savingTemplate} className="h-8 text-xs">
                Reset
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
