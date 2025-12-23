'use client';

import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './pdf-styles';
import {
  CombinedPnL,
  PnLEntry,
  calculateProfitMargin,
  groupEntriesByCategory,
} from '@/lib/utils/pnl';
import { formatPdfCurrency } from '@/lib/utils/pdf';

interface PnLPDFDocumentProps {
  data: {
    revenue: number;
    expenses: number;
    netIncome: number;
    entries: PnLEntry[];
  };
  combinedData?: CombinedPnL;
  entityName: string;
  dateRange: string;
  isCombined: boolean;
}

export function PnLPDFDocument({
  data,
  combinedData,
  entityName,
  dateRange,
  isCombined,
}: PnLPDFDocumentProps) {
  const profitMargin = calculateProfitMargin(data.revenue, data.expenses);
  const groupedEntries = groupEntriesByCategory(data.entries);
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const revenueEntries = Object.entries(groupedEntries).filter(([, v]) => v.revenue > 0);
  const expenseEntries = Object.entries(groupedEntries).filter(([, v]) => v.expense > 0);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.companyName}>KeyHub Central</Text>
          <Text style={pdfStyles.reportTitle}>Profit & Loss Statement</Text>
          <Text style={pdfStyles.reportMeta}>Entity: {entityName}</Text>
          <Text style={pdfStyles.reportMeta}>Period: {dateRange}</Text>
          <Text style={pdfStyles.reportMeta}>Generated: {generatedDate}</Text>
        </View>

        {/* Intercompany Note (Combined view only) */}
        {isCombined && combinedData && combinedData.intercompanyRevenue > 0 && (
          <View style={pdfStyles.intercompanyNote}>
            <Text>
              Note: Intercompany transactions of {formatPdfCurrency(combinedData.intercompanyRevenue)}{' '}
              have been eliminated from the combined view.
            </Text>
          </View>
        )}

        {/* Summary Cards */}
        <View style={pdfStyles.summaryGrid}>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Revenue</Text>
            <Text style={pdfStyles.summaryValuePositive}>
              {formatPdfCurrency(data.revenue)}
            </Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Expenses</Text>
            <Text style={pdfStyles.summaryValueNegative}>
              {formatPdfCurrency(data.expenses)}
            </Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Net Income</Text>
            <Text
              style={
                data.netIncome >= 0
                  ? pdfStyles.summaryValuePositive
                  : pdfStyles.summaryValueNegative
              }
            >
              {formatPdfCurrency(data.netIncome)}
            </Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Profit Margin</Text>
            <Text
              style={
                profitMargin >= 0
                  ? pdfStyles.summaryValuePositive
                  : pdfStyles.summaryValueNegative
              }
            >
              {profitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Revenue Breakdown</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableCellLeft, pdfStyles.tableHeaderText]}>Category</Text>
              <Text style={[pdfStyles.tableCellRight, pdfStyles.tableHeaderText]}>Amount</Text>
            </View>
            {revenueEntries.length === 0 ? (
              <Text style={pdfStyles.emptyMessage}>No revenue recorded for this period</Text>
            ) : (
              <>
                {revenueEntries.map(([category, values]) => (
                  <View key={category} style={pdfStyles.tableRow}>
                    <Text style={pdfStyles.tableCellLeft}>{category}</Text>
                    <Text style={pdfStyles.tableCellRight}>
                      {formatPdfCurrency(values.revenue)}
                    </Text>
                  </View>
                ))}
                <View style={pdfStyles.tableRowTotal}>
                  <Text style={[pdfStyles.tableCellLeft, pdfStyles.tableTotalText]}>
                    Total Revenue
                  </Text>
                  <Text style={[pdfStyles.tableCellRight, pdfStyles.tableTotalText]}>
                    {formatPdfCurrency(data.revenue)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Expense Breakdown */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Expense Breakdown</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableCellLeft, pdfStyles.tableHeaderText]}>Category</Text>
              <Text style={[pdfStyles.tableCellRight, pdfStyles.tableHeaderText]}>Amount</Text>
            </View>
            {expenseEntries.length === 0 ? (
              <Text style={pdfStyles.emptyMessage}>No expenses recorded for this period</Text>
            ) : (
              <>
                {expenseEntries.map(([category, values]) => (
                  <View key={category} style={pdfStyles.tableRow}>
                    <Text style={pdfStyles.tableCellLeft}>{category}</Text>
                    <Text style={pdfStyles.tableCellRight}>
                      {formatPdfCurrency(values.expense)}
                    </Text>
                  </View>
                ))}
                <View style={pdfStyles.tableRowTotal}>
                  <Text style={[pdfStyles.tableCellLeft, pdfStyles.tableTotalText]}>
                    Total Expenses
                  </Text>
                  <Text style={[pdfStyles.tableCellRight, pdfStyles.tableTotalText]}>
                    {formatPdfCurrency(data.expenses)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Entity Comparison (Combined view only) */}
        {isCombined && combinedData && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Entity Comparison</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.entityTableHeader}>
                <Text style={[pdfStyles.entityCellName, pdfStyles.tableHeaderText]}>Entity</Text>
                <Text style={[pdfStyles.entityCellValue, pdfStyles.tableHeaderText]}>Revenue</Text>
                <Text style={[pdfStyles.entityCellValue, pdfStyles.tableHeaderText]}>Expenses</Text>
                <Text style={[pdfStyles.entityCellValue, pdfStyles.tableHeaderText]}>Net Income</Text>
                <Text style={[pdfStyles.entityCellValue, pdfStyles.tableHeaderText]}>Margin</Text>
              </View>
              {combinedData.entities.map((entity) => {
                const margin = calculateProfitMargin(entity.revenue, entity.expenses);
                return (
                  <View key={entity.entity} style={pdfStyles.entityTableRow}>
                    <Text style={pdfStyles.entityCellName}>{entity.entityName}</Text>
                    <Text style={pdfStyles.entityCellValue}>
                      {formatPdfCurrency(entity.revenue)}
                    </Text>
                    <Text style={pdfStyles.entityCellValue}>
                      {formatPdfCurrency(entity.expenses)}
                    </Text>
                    <Text style={pdfStyles.entityCellValue}>
                      {formatPdfCurrency(entity.netIncome)}
                    </Text>
                    <Text style={pdfStyles.entityCellValue}>{margin.toFixed(1)}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={pdfStyles.footer}>
          KeyHub Central - Confidential Financial Document
        </Text>
      </Page>
    </Document>
  );
}
