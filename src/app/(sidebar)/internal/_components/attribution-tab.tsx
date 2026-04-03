'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Copy,
  Download,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTablePagination } from './data-table-pagination';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { PAGE_SIZE, formatDate } from './internal-utils';

const UNATTRIBUTED_FILTER_VALUE = '__unattributed__';
const DEFAULT_TEMPLATE_FORM = {
  name: '',
  description: '',
  source: '',
  medium: '',
  campaign: '',
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

function normalizeTemplateValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildSignupRelativePath(template: {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
}) {
  const params = new URLSearchParams();
  const source = normalizeTemplateValue(template.source);
  const medium = normalizeTemplateValue(template.medium);
  const campaign = normalizeTemplateValue(template.campaign);
  if (source) params.set('src', source);
  if (medium) params.set('utm_medium', medium);
  if (campaign) params.set('utm_campaign', campaign);
  const search = params.toString();
  return search ? `/signup?${search}` : '/signup';
}

function buildSignupUrl(origin: string, template: {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
}) {
  return `${origin.replace(/\/+$/, '')}${buildSignupRelativePath(template)}`;
}

/* ────────────────────────────── Stat Card ────────────────────────────── */

function StatCard({ title, value, subtitle, accent }: {
  title: string;
  value: number;
  subtitle: string;
  accent?: 'default' | 'success' | 'warning';
}) {
  const accentClasses = {
    default: 'from-primary/5 to-transparent',
    success: 'from-[hsl(var(--success))]/8 to-transparent',
    warning: 'from-[hsl(var(--warning))]/8 to-transparent',
  };

  return (
    <div className="rounded-xl border bg-gradient-to-br p-4 relative overflow-hidden group">
      <div className={`absolute inset-0 bg-gradient-to-br ${accentClasses[accent ?? 'default']} opacity-60`} />
      <div className="relative">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tracking-tight mt-1">{value.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
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
      referrerDomain: referrerDomainFilter.trim() || undefined,
    }),
    [fromDate, toDate, sourceFilter, mediumFilter, campaignFilter, referrerDomainFilter]
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
    return { ...params, referrerDomain: filterValue };
  }, [baseReportingParams, selectedBreakdown, userSearch]);

  const templatePreview = useMemo(
    () => buildSignupUrl(appOrigin, templateForm),
    [appOrigin, templateForm]
  );

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

  const hasAttributionFilters = sourceFilter || mediumFilter || campaignFilter || referrerDomainFilter;

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <Tabs
      value={activeView}
      onValueChange={(value) => setActiveView(value as AttributionSubview)}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Signup Attribution</h2>
            <p className="text-xs text-muted-foreground">Track where signups come from and manage campaign links.</p>
          </div>
        </div>
        <TabsList>
          <TabsTrigger value="reporting" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Reporting
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <Link2 className="h-3.5 w-3.5" />
            Link Templates
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ─────────────────── REPORTING TAB ─────────────────── */}
      <TabsContent value="reporting" className="space-y-5">
        {/* Filters */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Filters</span>
            </div>
            <div className="flex items-center gap-2">
              {hasAttributionFilters && (
                <button
                  onClick={() => {
                    setSourceFilter('');
                    setMediumFilter('');
                    setCampaignFilter('');
                    setReferrerDomainFilter('');
                    setBreakdownPage(1);
                    setUsersPage(1);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Clear filters
                </button>
              )}
              <Button variant="outline" size="sm" onClick={() => void loadReporting()} disabled={reportingLoading} className="h-7 text-xs gap-1.5">
                <RefreshCw className={`h-3 w-3 ${reportingLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Date range: presets as chips + custom inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">Range</span>
            <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => handlePresetChange(range)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    presetRange === range
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range === 'all' ? 'All time' : `Last ${range}`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => handleCustomDateChange('from', e.target.value)}
                className="h-7 w-[130px] text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => handleCustomDateChange('to', e.target.value)}
                className="h-7 w-[130px] text-xs"
              />
            </div>
          </div>

          {/* Attribution dimension filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">Dims</span>
            {[
              { value: sourceFilter, onChange: setSourceFilter, placeholder: 'Source' },
              { value: mediumFilter, onChange: setMediumFilter, placeholder: 'Medium' },
              { value: campaignFilter, onChange: setCampaignFilter, placeholder: 'Campaign' },
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
                  className="h-7 w-[120px] text-xs pl-2.5 pr-6"
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
          </div>
        </div>

        {reportingError && <ErrorState message={reportingError} onRetry={() => void loadReporting()} />}

        {/* Stats Row */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total Signups" value={overview?.totalSignups ?? 0} subtitle="In filtered window" />
          <StatCard title="Attributed" value={overview?.attributedSignups ?? 0} subtitle="With attribution data" accent="success" />
          <StatCard title="Unattributed" value={overview?.unattributedSignups ?? 0} subtitle="No attribution captured" accent="warning" />
          <StatCard title="Sources" value={overview?.uniqueSources ?? 0} subtitle="Distinct sources" />
          <StatCard title="Campaigns" value={overview?.uniqueCampaigns ?? 0} subtitle="Distinct campaigns" />
          <StatCard title="Media" value={overview?.uniqueMedia ?? 0} subtitle="Distinct media" />
        </div>

        {/* Breakdown + Users side by side */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">Breakdown</CardTitle>
                  <Select
                    value={groupBy}
                    onValueChange={(value: InternalSignupAttributionGroupBy) => {
                      setGroupBy(value);
                      setBreakdownPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="source">by source</SelectItem>
                      <SelectItem value="medium">by medium</SelectItem>
                      <SelectItem value="campaign">by campaign</SelectItem>
                      <SelectItem value="referrerDomain">by referrer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <p className="text-[11px] text-muted-foreground mt-0.5">Click a row to filter the user drilldown.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!breakdown?.items.length && !reportingLoading ? (
                <EmptyState
                  icon={BarChart3}
                  title="No breakdown data"
                  description="No signups match the current attribution filters."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{groupBy}</TableHead>
                        <TableHead className="text-xs text-right w-[80px]">Signups</TableHead>
                        <TableHead className="text-xs text-right w-[100px]">% of total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportingLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={3} className="py-2">
                              <div className="h-4 w-full animate-pulse rounded bg-muted" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        breakdown?.items.map((row) => {
                          const isSelected =
                            selectedBreakdown?.groupBy === groupBy &&
                            selectedBreakdown?.value === row.value &&
                            selectedBreakdown?.isUnattributed === row.isUnattributed;
                          const pct = row.percentOfFilteredTotal;

                          return (
                            <TableRow
                              key={`${row.key}-${row.value ?? 'null'}`}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : 'hover:bg-muted/40'
                              }`}
                              onClick={() =>
                                handleSelectBreakdownRow({
                                  groupBy,
                                  key: row.key,
                                  value: row.value,
                                  isUnattributed: row.isUnattributed,
                                })
                              }
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{row.key}</span>
                                  {row.isUnattributed && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                      None
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {row.signups.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-primary transition-all"
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-[48px] text-right">
                                    {pct.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <DataTablePagination
                page={breakdown?.page ?? breakdownPage}
                totalPages={breakdown?.totalPages ?? 1}
                totalItems={breakdown?.totalItems ?? 0}
                itemLabel="groups"
                isLoading={reportingLoading}
                onPageChange={setBreakdownPage}
              />
            </CardContent>
          </Card>

          {/* Users drilldown */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Signup Users</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedBreakdown ? (
                      <span className="inline-flex items-center gap-1">
                        Filtered to <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{selectedBreakdown.key}</Badge>
                        <button onClick={() => setSelectedBreakdown(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : (
                      'Users matching the current filters.'
                    )}
                  </p>
                </div>
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
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
                  placeholder="Search username, email, or attribution value..."
                  className="h-8 text-xs pl-8 pr-7"
                />
                {userSearch && (
                  <button
                    onClick={() => { setUserSearch(''); setUsersPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {usersError && <ErrorState message={usersError} onRetry={() => void loadUsers()} />}

              {!users?.items.length && !usersLoading ? (
                <EmptyState
                  icon={Users}
                  title="No users found"
                  description="No completed signups match the current drilldown."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">User</TableHead>
                        <TableHead className="text-xs">Joined</TableHead>
                        <TableHead className="text-xs">Source</TableHead>
                        <TableHead className="text-xs">Medium</TableHead>
                        <TableHead className="text-xs">Campaign</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={5} className="py-2">
                              <div className="h-4 w-full animate-pulse rounded bg-muted" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        users?.items.map((user: InternalSignupAttributionUserRow) => (
                          <TableRow key={user.userId}>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{user.username}</p>
                                <p className="text-[11px] text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(user.joinDate)}
                            </TableCell>
                            <TableCell>
                              {user.signupSource ? (
                                <Badge variant="outline" className="text-[10px]">{user.signupSource}</Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/50">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.signupMedium ? (
                                <Badge variant="outline" className="text-[10px]">{user.signupMedium}</Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/50">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.signupCampaign ? (
                                <Badge variant="outline" className="text-[10px]">{user.signupCampaign}</Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/50">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <DataTablePagination
                page={users?.page ?? usersPage}
                totalPages={users?.totalPages ?? 1}
                totalItems={users?.totalItems ?? 0}
                itemLabel="users"
                isLoading={usersLoading}
                onPageChange={setUsersPage}
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ─────────────────── TEMPLATES TAB ─────────────────── */}
      <TabsContent value="templates" className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Template list */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Saved Templates</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Reusable signup links for marketing and product teams.</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => void loadTemplates()} disabled={templatesLoading}>
                  <RefreshCw className={`h-3 w-3 ${templatesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {templatesError && <ErrorState message={templatesError} onRetry={() => void loadTemplates()} />}

              {!templates.length && !templatesLoading ? (
                <EmptyState
                  icon={Link2}
                  title="No saved templates"
                  description="Create a reusable signup link template to get started."
                />
              ) : (
                <div className="space-y-2">
                  {templatesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted/40" />
                    ))
                  ) : (
                    templates.map((template) => {
                      const url = buildSignupUrl(appOrigin, template);
                      return (
                        <div
                          key={template.id}
                          className={`group rounded-lg border p-3 transition-colors hover:bg-muted/30 ${
                            editingTemplateId === template.id ? 'ring-1 ring-primary/30 bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{template.name}</p>
                                <Badge variant={template.isActive ? 'default' : 'outline'} className="text-[10px] h-4 px-1.5">
                                  {template.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              {template.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
                              )}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {template.source && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{template.source}</Badge>}
                                {template.medium && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{template.medium}</Badge>}
                                {template.campaign && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{template.campaign}</Badge>}
                              </div>
                            </div>
                            <TooltipProvider delayDuration={200}>
                              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleCopyText(url, 'URL')}>
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom"><p className="text-xs">Copy URL</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTemplate(template)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom"><p className="text-xs">Edit</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicateTemplate(template)}>
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom"><p className="text-xs">Duplicate</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      disabled={deletingTemplateId === template.id}
                                      onClick={() => void handleDeleteTemplate(template)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom"><p className="text-xs">Delete</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </div>
                          <p className="font-mono text-[10px] text-muted-foreground mt-2 truncate">{url}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {editingTemplateId ? 'Edit Template' : 'New Template'}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Generate a reusable signup link and save it for the team.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
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

              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-xs font-medium">Active</p>
                  <p className="text-[10px] text-muted-foreground">Inactive templates stay saved but are hidden.</p>
                </div>
                <Switch
                  checked={templateForm.isActive}
                  onCheckedChange={(checked) => setTemplateForm((c) => ({ ...c, isActive: checked }))}
                />
              </div>

              <Separator />

              {/* Preview */}
              <div className="space-y-1.5">
                <Label className="text-xs">Live Preview</Label>
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <p className="break-all font-mono text-[11px] leading-relaxed">{templatePreview}</p>
                </div>
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
                    onClick={() => void handleCopyText(buildSignupRelativePath(templateForm), 'Path')}
                  >
                    <Copy className="h-3 w-3" />
                    Copy path
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={() => void handleSaveTemplate()} disabled={savingTemplate} className="flex-1 h-8 text-xs">
                  {editingTemplateId ? 'Update template' : 'Create template'}
                </Button>
                <Button variant="outline" onClick={resetTemplateForm} disabled={savingTemplate} className="h-8 text-xs">
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
