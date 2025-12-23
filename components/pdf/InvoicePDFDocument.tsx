'use client';

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { Invoice, NET_TERMS_DAYS } from '@/types/invoice';
import { formatPdfCurrency } from '@/lib/utils/pdf';

// Invoice-specific styles
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
  invoiceTitle: {
    textAlign: 'right',
  },
  invoiceLabel: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  statusPaid: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusSent: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  statusDraft: {
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
  },
  statusOverdue: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  partiesSection: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 40,
  },
  partyBox: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 9,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  partyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 10,
    color: '#444444',
  },
  datesSection: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 30,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  dateValue: {
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
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  colDescription: {
    flex: 3,
  },
  colQty: {
    flex: 1,
    textAlign: 'center',
  },
  colRate: {
    flex: 1,
    textAlign: 'right',
  },
  colTotal: {
    flex: 1,
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    color: '#666666',
  },
  totalValue: {
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: '#000000',
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  footerTerms: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerNote: {
    fontSize: 8,
    color: '#999999',
    textAlign: 'center',
  },
});

interface InvoicePDFDocumentProps {
  invoice: Invoice;
}

export function InvoicePDFDocument({ invoice }: InvoicePDFDocumentProps) {
  const formatDate = (timestamp: { toDate: () => Date } | null): string => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatEntityName = (entity: string): string => {
    switch (entity) {
      case 'kd':
        return 'Keynote Digital';
      case 'kts':
        return 'Key Trade Solutions';
      case 'kr':
        return 'Key Renovations';
      case 'customer':
        return 'Customer';
      case 'subscriber':
        return 'Subscriber';
      default:
        return entity;
    }
  };

  const getStatusStyle = () => {
    switch (invoice.status) {
      case 'paid':
        return styles.statusPaid;
      case 'sent':
        return styles.statusSent;
      case 'draft':
        return styles.statusDraft;
      default:
        return styles.statusDraft;
    }
  };

  // Check if overdue
  const isOverdue =
    invoice.status === 'sent' && invoice.dueDate && invoice.dueDate.toDate() < new Date();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>KeyHub Central</Text>
            <Text style={styles.companyTagline}>Business Management Platform</Text>
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View style={[styles.statusBadge, isOverdue ? styles.statusOverdue : getStatusStyle()]}>
              <Text style={styles.statusText}>
                {isOverdue ? 'OVERDUE' : invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* From / To */}
        <View style={styles.partiesSection}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>From</Text>
            <Text style={styles.partyName}>{formatEntityName(invoice.from.entity)}</Text>
            <Text style={styles.partyDetail}>{invoice.from.name}</Text>
            {invoice.from.email && <Text style={styles.partyDetail}>{invoice.from.email}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Bill To</Text>
            <Text style={styles.partyName}>{formatEntityName(invoice.to.entity)}</Text>
            <Text style={styles.partyDetail}>{invoice.to.name}</Text>
            {invoice.to.email && <Text style={styles.partyDetail}>{invoice.to.email}</Text>}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesSection}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Invoice Date</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.createdAt)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Due Date</Text>
            <Text style={[styles.dateValue, isOverdue ? { color: '#991b1b' } : {}]}>
              {formatDate(invoice.dueDate)}
            </Text>
          </View>
          {invoice.paidAt && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Paid Date</Text>
              <Text style={[styles.dateValue, { color: '#166534' }]}>
                {formatDate(invoice.paidAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>
          {invoice.lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={styles.colRate}>{formatPdfCurrency(item.rate)}</Text>
              <Text style={styles.colTotal}>{formatPdfCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatPdfCurrency(invoice.subtotal)}</Text>
          </View>
          {invoice.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#166534' }]}>
                -{formatPdfCurrency(invoice.discount)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>{formatPdfCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTerms}>
            Payment Terms: Net {NET_TERMS_DAYS} days. Please include invoice number with payment.
          </Text>
          <Text style={styles.footerNote}>
            Thank you for your business. Questions? Contact us at billing@keyhubcentral.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}
