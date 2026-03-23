'use client';

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { AddendumType, ADDENDUM_TYPE_LABELS } from '@/types/contract';
import { tenant } from '@/lib/config/tenant';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  companyInfo: {
    fontSize: 8,
    color: '#666666',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 130,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    flex: 1,
  },
  description: {
    fontSize: 10,
    lineHeight: 1.5,
    padding: 8,
    borderWidth: 1,
    borderColor: '#cccccc',
    backgroundColor: '#fafafa',
    marginTop: 4,
  },
  costImpact: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  agreementText: {
    fontSize: 9,
    lineHeight: 1.5,
    marginTop: 12,
    marginBottom: 12,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  signatureBlock: {
    width: '45%',
    alignItems: 'center',
  },
  signatureImage: {
    width: 160,
    height: 50,
    objectFit: 'contain',
    marginBottom: 4,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    width: '100%',
    paddingTop: 4,
    textAlign: 'center',
    fontSize: 9,
  },
  signatureDate: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 8,
  },
});

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

interface AddendumPDFDocumentProps {
  jobNumber: string;
  addendumNumber: number;
  type: AddendumType;
  description: string;
  costImpact: number;
  customerName: string;
  contractorName: string;
  customerAddress: string;
  signedDate: string;
  customerSignatureUrl?: string;
  contractorSignatureUrl?: string;
}

export function AddendumPDFDocument({
  jobNumber,
  addendumNumber,
  type,
  description,
  costImpact,
  customerName,
  contractorName,
  customerAddress,
  signedDate,
  customerSignatureUrl,
  contractorSignatureUrl,
}: AddendumPDFDocumentProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{tenant.entities.kr.label}</Text>
          <Text style={styles.companyInfo}>A division of {tenant.appName}</Text>
        </View>

        <Text style={styles.title}>CONTRACT ADDENDUM #{addendumNumber}</Text>

        {/* Job & Addendum Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Job Number:</Text>
            <Text style={styles.value}>{jobNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Property Address:</Text>
            <Text style={styles.value}>{customerAddress}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Change Type:</Text>
            <Text style={styles.value}>{ADDENDUM_TYPE_LABELS[type]}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{signedDate}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description of Changes</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {/* Cost Impact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Impact</Text>
          <Text style={styles.costImpact}>
            {costImpact === 0
              ? 'No change to contract price'
              : costImpact > 0
              ? `Contract price increase: +${fmt(costImpact)}`
              : `Contract price decrease: ${fmt(costImpact)}`}
          </Text>
        </View>

        {/* Agreement */}
        <Text style={styles.agreementText}>
          Both parties agree to the changes described above. This addendum becomes part of
          the original contract for Job #{jobNumber}. All other terms and conditions of the
          original contract remain in full force and effect. Customer acknowledges they have
          read and understand the changes described herein.
        </Text>

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            {customerSignatureUrl && (
              <Image style={styles.signatureImage} src={customerSignatureUrl} />
            )}
            <Text style={styles.signatureLine}>{customerName}</Text>
            <Text style={styles.signatureDate}>Customer — {signedDate}</Text>
          </View>
          <View style={styles.signatureBlock}>
            {contractorSignatureUrl && (
              <Image style={styles.signatureImage} src={contractorSignatureUrl} />
            )}
            <Text style={styles.signatureLine}>{contractorName}</Text>
            <Text style={styles.signatureDate}>Contractor — {signedDate}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This addendum was electronically signed and generated by {tenant.appName}.
          Addendum #{addendumNumber} for Job #{jobNumber} | Generated: {signedDate}
        </Text>
      </Page>
    </Document>
  );
}
