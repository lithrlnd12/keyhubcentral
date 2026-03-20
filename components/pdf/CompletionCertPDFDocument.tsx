'use client';

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Job } from '@/types/job';
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
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 8,
    color: '#666666',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 20,
    textDecoration: 'underline',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
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
  costTable: {
    marginTop: 8,
  },
  costHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    padding: 4,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  costRow: {
    flexDirection: 'row',
    padding: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
  },
  costTotalRow: {
    flexDirection: 'row',
    padding: 4,
    borderTopWidth: 1.5,
    borderTopColor: '#000000',
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  costCol1: { width: '30%' },
  costCol2: { width: '23%', textAlign: 'right' },
  costCol3: { width: '23%', textAlign: 'right' },
  costCol4: { width: '24%', textAlign: 'right' },
  agreementText: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#cccccc',
    backgroundColor: '#fafafa',
  },
  signatureSection: {
    marginTop: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  signatureBlock: {
    width: '45%',
    alignItems: 'center',
  },
  signatureImage: {
    width: 180,
    height: 60,
    objectFit: 'contain',
    marginBottom: 4,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    width: '100%',
    paddingTop: 4,
    textAlign: 'center',
  },
  signatureDate: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2,
  },
  notes: {
    marginTop: 15,
    padding: 8,
    borderWidth: 0.5,
    borderColor: '#cccccc',
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#333333',
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

interface CompletionCertPDFDocumentProps {
  job: Job;
  customerName: string;
  contractorName: string;
  notes?: string;
  signedDate: string;
  customerSignatureUrl?: string;
  contractorSignatureUrl?: string;
}

export function CompletionCertPDFDocument({
  job,
  customerName,
  contractorName,
  notes,
  signedDate,
  customerSignatureUrl,
  contractorSignatureUrl,
}: CompletionCertPDFDocumentProps) {
  const costs = job.costs;
  const totalProjected = (costs?.materialProjected || 0) + (costs?.laborProjected || 0);
  const totalActual = (costs?.materialActual || 0) + (costs?.laborActual || 0);
  const totalVariance = totalActual - totalProjected;

  const address = job.customer?.address;
  const addressStr = address
    ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`
    : 'N/A';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{tenant.entities.kr.label}</Text>
          <Text style={styles.companyInfo}>A division of {tenant.appName}</Text>
        </View>

        <Text style={styles.title}>CERTIFICATE OF COMPLETION</Text>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Job Number:</Text>
            <Text style={styles.value}>{job.jobNumber || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{addressStr}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Project Type:</Text>
            <Text style={styles.value}>{job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) : 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Completion Date:</Text>
            <Text style={styles.value}>{signedDate}</Text>
          </View>
        </View>

        {/* Cost Summary */}
        {costs && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cost Summary</Text>
            <View style={styles.costTable}>
              <View style={styles.costHeaderRow}>
                <Text style={styles.costCol1}>Category</Text>
                <Text style={styles.costCol2}>Projected</Text>
                <Text style={styles.costCol3}>Actual</Text>
                <Text style={styles.costCol4}>Variance</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costCol1}>Materials</Text>
                <Text style={styles.costCol2}>{fmt(costs.materialProjected)}</Text>
                <Text style={styles.costCol3}>{fmt(costs.materialActual)}</Text>
                <Text style={styles.costCol4}>{fmt(costs.materialActual - costs.materialProjected)}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costCol1}>Labor</Text>
                <Text style={styles.costCol2}>{fmt(costs.laborProjected)}</Text>
                <Text style={styles.costCol3}>{fmt(costs.laborActual)}</Text>
                <Text style={styles.costCol4}>{fmt(costs.laborActual - costs.laborProjected)}</Text>
              </View>
              <View style={styles.costTotalRow}>
                <Text style={styles.costCol1}>Total</Text>
                <Text style={styles.costCol2}>{fmt(totalProjected)}</Text>
                <Text style={styles.costCol3}>{fmt(totalActual)}</Text>
                <Text style={styles.costCol4}>{fmt(totalVariance)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Agreement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acknowledgment</Text>
          <Text style={styles.agreementText}>
            I, {customerName}, hereby acknowledge that the work described above has been completed
            to my satisfaction. I have inspected the finished work and confirm that it meets the
            agreed-upon specifications. I understand that this Certificate of Completion serves
            as my formal acceptance of the completed project.
          </Text>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Additional Notes:</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureSection}>
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
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This certificate was electronically signed and generated by {tenant.appName}.
          Document ID: {job.id} | Generated: {signedDate}
        </Text>
      </Page>
    </Document>
  );
}
