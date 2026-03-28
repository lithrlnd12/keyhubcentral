'use client';

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ReportConfig, ReportResult } from '@/types/report';
import { getMetricFormat, formatMetricValue } from '@/lib/utils/reportEngine';
import { tenant } from '@/lib/config/tenant';

// Derive PDF palette from tenant brand config
const PRIMARY = tenant.colors.primary;
// Light tint of primary for backgrounds (50% opacity simulation via blending with white)
const PRIMARY_TINT = (() => {
  // Convert hex to a very light tint: blend primary with white at 15%
  const hex = PRIMARY.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const tr = Math.round(r * 0.15 + 255 * 0.85).toString(16).padStart(2, '0');
  const tg = Math.round(g * 0.15 + 255 * 0.85).toString(16).padStart(2, '0');
  const tb = Math.round(b * 0.15 + 255 * 0.85).toString(16).padStart(2, '0');
  return `#${tr}${tg}${tb}`;
})();
const DARK = tenant.colors.background;
const SURFACE = tenant.colors.surface;
const WHITE = '#FFFFFF';
const GRAY_TEXT = '#6B7280';
const GRAY_LIGHT = '#F9FAFB';
const GRAY_BORDER = '#E5E7EB';

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: WHITE,
  },
  // ── Header band ──
  headerBand: {
    backgroundColor: DARK,
    paddingHorizontal: 40,
    paddingVertical: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY,
    marginBottom: 3,
  },
  companyTagline: {
    fontSize: 9,
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  reportTitleBlock: {
    alignItems: 'flex-end',
  },
  reportLabel: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    textAlign: 'right',
  },
  reportSubtitle: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 3,
    textAlign: 'right',
  },
  // ── Primary accent stripe ──
  accentStripe: {
    backgroundColor: PRIMARY,
    height: 4,
    marginBottom: 24,
  },
  // ── Body ──
  body: {
    paddingHorizontal: 40,
  },
  // ── Meta cards ──
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metaCard: {
    flex: 1,
    backgroundColor: GRAY_LIGHT,
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  metaLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  // ── Section heading ──
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY,
  },
  // ── Table ──
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  tableHeaderText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRowEven: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  tableRowOdd: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: GRAY_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  totalsRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: PRIMARY_TINT,
    borderTopWidth: 2,
    borderTopColor: PRIMARY,
    marginTop: 2,
    borderRadius: 4,
  },
  colGroup: {
    flex: 2,
  },
  colMetric: {
    flex: 1,
    textAlign: 'right',
  },
  cellText: {
    fontSize: 9,
    color: '#374151',
  },
  boldText: {
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  totalsText: {
    fontFamily: 'Helvetica-Bold',
    color: SURFACE,
    fontSize: 9,
  },
  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
    paddingTop: 8,
  },
  footerLeft: {
    fontSize: 8,
    color: GRAY_TEXT,
  },
  footerRight: {
    fontSize: 8,
    color: PRIMARY,
    fontFamily: 'Helvetica-Bold',
  },
});

interface ReportPDFDocumentProps {
  config: ReportConfig;
  result: ReportResult;
}

export function ReportPDFDocument({ config, result }: ReportPDFDocumentProps) {
  const hasGroup = !!config.groupBy;

  const fmtValue = (metric: { source: string; field: string }, value: unknown): string => {
    const num = typeof value === 'number' ? value : 0;
    const format = getMetricFormat(metric.source as any, metric.field);
    return formatMetricValue(num, format);
  };

  const generatedDate = new Date(result.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Dark header band */}
        <View style={styles.headerBand}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{tenant.appName}</Text>
            <Text style={styles.companyTagline}>BUSINESS MANAGEMENT PLATFORM</Text>
          </View>
          <View style={styles.reportTitleBlock}>
            <Text style={styles.reportLabel}>{config.name || 'Report'}</Text>
            {config.description && (
              <Text style={styles.reportSubtitle}>{config.description}</Text>
            )}
          </View>
        </View>

        {/* Gold accent stripe */}
        <View style={styles.accentStripe} />

        <View style={styles.body}>
          {/* Meta cards */}
          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Date Range</Text>
              <Text style={styles.metaValue}>
                {config.dateRange.start}  →  {config.dateRange.end}
              </Text>
            </View>
            {config.groupBy && (
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Grouped By</Text>
                <Text style={styles.metaValue}>{config.groupBy}</Text>
              </View>
            )}
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Total Records</Text>
              <Text style={styles.metaValue}>{result.data.length}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Generated</Text>
              <Text style={styles.metaValue}>{generatedDate}</Text>
            </View>
          </View>

          {/* Table */}
          <Text style={styles.sectionHeading}>Report Data</Text>
          <View style={styles.table}>
            {/* Header Row */}
            <View style={styles.tableHeader}>
              {hasGroup && (
                <Text style={[styles.tableHeaderText, styles.colGroup]}>Group</Text>
              )}
              {config.metrics.map((metric) => (
                <Text key={metric.label} style={[styles.tableHeaderText, styles.colMetric]}>
                  {metric.label}
                </Text>
              ))}
            </View>

            {/* Data Rows — alternating */}
            {result.data.map((row, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                {hasGroup && (
                  <Text style={[styles.colGroup, styles.cellText]}>{String(row.group || '—')}</Text>
                )}
                {config.metrics.map((metric) => (
                  <Text key={metric.label} style={[styles.colMetric, styles.cellText]}>
                    {fmtValue(metric, row[metric.label])}
                  </Text>
                ))}
              </View>
            ))}

            {/* Totals Row */}
            <View style={styles.totalsRow}>
              {hasGroup && (
                <Text style={[styles.colGroup, styles.totalsText]}>TOTALS</Text>
              )}
              {config.metrics.map((metric) => (
                <Text key={metric.label} style={[styles.colMetric, styles.totalsText]}>
                  {fmtValue(metric, result.totals[metric.label])}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>
            {tenant.appName} · Confidential
          </Text>
          <Text style={styles.footerRight}>
            Report Builder
          </Text>
        </View>
      </Page>
    </Document>
  );
}
