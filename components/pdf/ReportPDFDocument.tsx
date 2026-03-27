'use client';

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ReportConfig, ReportResult } from '@/types/report';
import { getMetricFormat, formatMetricValue } from '@/lib/utils/reportEngine';
import { tenant } from '@/lib/config/tenant';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  companyTagline: {
    fontSize: 9,
    color: '#666666',
  },
  reportTitle: {
    textAlign: 'right',
  },
  reportLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
  },
  reportSubtitle: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
  },
  metaSection: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 30,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  colGroup: {
    flex: 2,
  },
  colMetric: {
    flex: 1,
    textAlign: 'right',
  },
  boldText: {
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  footerNote: {
    fontSize: 8,
    color: '#999999',
    textAlign: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{tenant.appName}</Text>
            <Text style={styles.companyTagline}>Business Management Platform</Text>
          </View>
          <View style={styles.reportTitle}>
            <Text style={styles.reportLabel}>{config.name || 'Report'}</Text>
            {config.description && (
              <Text style={styles.reportSubtitle}>{config.description}</Text>
            )}
          </View>
        </View>

        {/* Meta Info */}
        <View style={styles.metaSection}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date Range</Text>
            <Text style={styles.metaValue}>
              {config.dateRange.start} to {config.dateRange.end}
            </Text>
          </View>
          {config.groupBy && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Grouped By</Text>
              <Text style={styles.metaValue}>{config.groupBy}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Generated</Text>
            <Text style={styles.metaValue}>
              {new Date(result.generatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Table */}
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

          {/* Data Rows */}
          {result.data.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              {hasGroup && (
                <Text style={styles.colGroup}>{String(row.group || '')}</Text>
              )}
              {config.metrics.map((metric) => (
                <Text key={metric.label} style={styles.colMetric}>
                  {fmtValue(metric, row[metric.label])}
                </Text>
              ))}
            </View>
          ))}

          {/* Totals Row */}
          <View style={styles.totalsRow}>
            {hasGroup && (
              <Text style={[styles.colGroup, styles.boldText]}>Totals</Text>
            )}
            {config.metrics.map((metric) => (
              <Text key={metric.label} style={[styles.colMetric, styles.boldText]}>
                {fmtValue(metric, result.totals[metric.label])}
              </Text>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Generated by {tenant.appName} Report Builder
          </Text>
        </View>
      </Page>
    </Document>
  );
}
