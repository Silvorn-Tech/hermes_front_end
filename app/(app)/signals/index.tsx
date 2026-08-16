import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../../../components/common/Text';
import { Tabs } from '../../../components/common/Tabs';
import { FilterBar, FilterSheetButton, FilterGroup } from '../../../components/common/Filters';
import { EmptyState } from '../../../components/common/EmptyState';
import { SkeletonCard } from '../../../components/common/LoadingSkeleton';
import { PreviewBanner } from '../../../components/common/PreviewBanner';
import { SignalCard } from '../../../components/signals/SignalCard';
import { useHermesData } from '../../../hooks/HermesDataContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { spacing, colors } from '../../../constants';
import { formatRelativeTime } from '../../../utils/format';

const mainTabs = [
  { key: 'signals', label: 'Signals' },
  { key: 'activity', label: 'Activity' },
];

const activityFilterGroups: FilterGroup[] = [
  {
    key: 'category',
    label: 'Category',
    options: [
      { value: 'trade', label: 'Trade' },
      { value: 'risk', label: 'Risk' },
      { value: 'rebalance', label: 'Rebalance' },
      { value: 'system', label: 'System' },
    ],
  },
];

const filterGroups: FilterGroup[] = [
  {
    key: 'source',
    label: 'Source',
    options: [
      { value: 'bot', label: 'Bot' },
      { value: 'risk', label: 'Risk' },
      { value: 'system', label: 'System' },
    ],
  },
  {
    key: 'level',
    label: 'Level',
    options: [
      { value: 'ambient', label: 'Ambient' },
      { value: 'insight', label: 'Insight' },
      { value: 'signal', label: 'Signal' },
      { value: 'alert', label: 'Alert' },
      { value: 'action_required', label: 'Action Required' },
    ],
  },
  {
    key: 'bot',
    label: 'Bot',
    options: [
      { value: 'sentinel', label: 'Sentinel' },
      { value: 'equilibrium', label: 'Equilibrium' },
      { value: 'vortex', label: 'Vortex' },
    ],
  },
];

export default function SignalsScreen() {
  const { status, signals, activityEvents } = useHermesData();
  const { isDesktop } = useResponsive();
  const [tab, setTab] = useState<'signals' | 'activity'>('signals');
  const [selected, setSelected] = useState<Record<string, string | null>>({ source: null, level: null, bot: null });
  const [activitySelected, setActivitySelected] = useState<Record<string, string | null>>({ category: null });

  const hasActiveFilters = Object.values(selected).some(Boolean);
  const hasActiveActivityFilters = Object.values(activitySelected).some(Boolean);

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      if (selected.source === 'bot' && !s.botId) return false;
      if (selected.source === 'risk' && s.source !== 'risk') return false;
      if (selected.source === 'system' && s.source !== 'system') return false;
      if (selected.level && s.level !== selected.level) return false;
      if (selected.bot && s.botId !== selected.bot) return false;
      return true;
    });
  }, [signals, selected]);

  const filteredActivity = useMemo(() => {
    return activityEvents.filter((e) => !activitySelected.category || e.category === activitySelected.category);
  }, [activityEvents, activitySelected]);

  const relatedSignalFor = (eventId: string) => signals.find((s) => s.relatedEventIds.includes(eventId));

  const onSelect = (groupKey: string, value: string | null) => setSelected((prev) => ({ ...prev, [groupKey]: value }));
  const onSelectActivity = (groupKey: string, value: string | null) =>
    setActivitySelected((prev) => ({ ...prev, [groupKey]: value }));

  if (status === 'loading') {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <Text variant="display">Signals</Text>
        <Tabs items={mainTabs} activeKey={tab} onChange={(k) => setTab(k as typeof tab)} />
      </View>

      <PreviewBanner variant="preview" label="Vista previa — Signals/Activity API pendiente de backend" />

      {tab === 'signals' ? (
        <>
          {isDesktop ? (
            <FilterBar groups={filterGroups} selected={selected} onSelect={onSelect} />
          ) : (
            <FilterSheetButton groups={filterGroups} selected={selected} onSelect={onSelect} />
          )}

          {filteredSignals.length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? 'Sin resultados para este filtro.' : 'Hermes aún no tiene nada que interpretar.'}
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {filteredSignals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  relatedEvents={activityEvents.filter((e) => signal.relatedEventIds.includes(e.id))}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          {isDesktop ? (
            <FilterBar groups={activityFilterGroups} selected={activitySelected} onSelect={onSelectActivity} />
          ) : (
            <FilterSheetButton groups={activityFilterGroups} selected={activitySelected} onSelect={onSelectActivity} />
          )}

          {filteredActivity.length === 0 ? (
            <EmptyState
              title={hasActiveActivityFilters ? 'Sin resultados para este filtro.' : 'Sin actividad reciente.'}
            />
          ) : (
            <View style={{ gap: 0, borderTopWidth: 1, borderTopColor: colors.border }}>
              {filteredActivity.map((event) => {
                const relatedSignal = relatedSignalFor(event.id);
                return (
                  <View
                    key={event.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: spacing.md,
                      paddingVertical: spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="body" color="secondary">
                        {event.description}
                      </Text>
                      {relatedSignal ? (
                        <Text variant="caption" color="muted">
                          Signal relacionado: {relatedSignal.headline}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="caption" color="muted">
                      {formatRelativeTime(event.timestamp)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
