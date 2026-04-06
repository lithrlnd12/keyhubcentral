'use client';

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Job, JobCommunication } from '@/types/job';
import { SignedContract } from '@/types/contract';
import { ContractAddendum, ADDENDUM_TYPE_LABELS } from '@/types/contract';
import { tenant } from '@/lib/config/tenant';
import { PDFLabels, DEFAULT_PDF_LABELS } from '@/lib/utils/pdfLabels';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { textAlign: 'center', marginBottom: 15, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#000000' },
  companyName: { fontSize: 16, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  companyInfo: { fontSize: 7, color: '#666666' },
  title: { fontSize: 14, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 12, textDecoration: 'underline' },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', marginBottom: 6, backgroundColor: '#f0f0f0', padding: 4 },
  section: { marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 120, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', color: '#333333' },
  value: { flex: 1, color: '#000000' },
  table: { marginTop: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e0e0e0', padding: 4, fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', padding: 4, borderBottomWidth: 0.5, borderBottomColor: '#cccccc' },
  tableTotalRow: { flexDirection: 'row', padding: 4, borderTopWidth: 1.5, borderTopColor: '#000000', fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  col30: { width: '30%' },
  col23: { width: '23%', textAlign: 'right' },
  col24: { width: '24%', textAlign: 'right' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  photo: { width: 160, height: 120, objectFit: 'cover', borderRadius: 4 },
  photoCaption: { fontSize: 7, color: '#666666', marginTop: 2, width: 160 },
  noteBlock: { padding: 6, backgroundColor: '#fafafa', borderLeftWidth: 2, borderLeftColor: '#cccccc', marginBottom: 6 },
  noteHeader: { fontSize: 8, color: '#666666', marginBottom: 2 },
  noteText: { fontSize: 9 },
  badge: { fontSize: 8, padding: '2 6', borderRadius: 3, color: '#ffffff' },
  footer: { position: 'absolute', bottom: 25, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: '#999999', borderTopWidth: 0.5, borderTopColor: '#cccccc', paddingTop: 6 },
  pageNumber: { position: 'absolute', bottom: 25, right: 40, fontSize: 7, color: '#999999' },
  signatureImage: { width: 140, height: 50, objectFit: 'contain' },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  signatureBlock: { width: '45%', alignItems: 'center' },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#000000', width: '100%', paddingTop: 3, textAlign: 'center', fontSize: 8 },
  signatureDate: { fontSize: 7, color: '#666666', marginTop: 2 },
});

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = (ts: { toDate?: () => Date; seconds?: number } | null | undefined): string => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null;
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export type JobPackageData = {
  job: Job;
  contracts: SignedContract[];
  addendums: ContractAddendum[];
  communications: JobCommunication[];
  labels?: PDFLabels;
};

export function JobPackagePDF({ job, contracts, addendums, communications, labels: l = DEFAULT_PDF_LABELS }: JobPackageData) {
  const costs = job.costs;
  const totalProjected = (costs?.materialProjected || 0) + (costs?.laborProjected || 0);
  const totalActual = (costs?.materialActual || 0) + (costs?.laborActual || 0);
  const address = job.customer?.address;
  const addressStr = address ? `${address.street}, ${address.city}, ${address.state} ${address.zip}` : 'N/A';
  const cert = job.documents?.completionCert;

  return (
    <Document>
      {/* Page 1: Job Summary */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{tenant.entities.kr.label}</Text>
          <Text style={styles.companyInfo}>A division of {tenant.appName}</Text>
        </View>

        <Text style={styles.title}>{l.jobPackage} — {job.jobNumber}</Text>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{l.jobInformation}</Text>
          <View style={styles.row}><Text style={styles.label}>{l.jobNumber}:</Text><Text style={styles.value}>{job.jobNumber}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.status}:</Text><Text style={styles.value}>{job.status.replace(/_/g, ' ').toUpperCase()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.type}:</Text><Text style={styles.value}>{job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) : 'N/A'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.customer}:</Text><Text style={styles.value}>{job.customer.name}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.phone}:</Text><Text style={styles.value}>{job.customer.phone}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.email}:</Text><Text style={styles.value}>{job.customer.email}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.address}:</Text><Text style={styles.value}>{addressStr}</Text></View>
          {job.notes && <View style={styles.row}><Text style={styles.label}>{l.notes}:</Text><Text style={styles.value}>{job.notes}</Text></View>}
        </View>

        {/* Key Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{l.timeline}</Text>
          <View style={styles.row}><Text style={styles.label}>{l.created}:</Text><Text style={styles.value}>{fmtDate(job.dates?.created)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.sold}:</Text><Text style={styles.value}>{fmtDate(job.dates?.sold)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.scheduledStart}:</Text><Text style={styles.value}>{fmtDate(job.dates?.scheduledStart)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.actualStart}:</Text><Text style={styles.value}>{fmtDate(job.dates?.actualStart)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.targetCompletion}:</Text><Text style={styles.value}>{fmtDate(job.dates?.targetCompletion)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.actualCompletion}:</Text><Text style={styles.value}>{fmtDate(job.dates?.actualCompletion)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{l.paidInFull}:</Text><Text style={styles.value}>{fmtDate(job.dates?.paidInFull)}</Text></View>
        </View>

        {/* Cost Summary */}
        {costs && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{l.costBreakdown}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col30}>{l.category}</Text>
                <Text style={styles.col23}>{l.projected}</Text>
                <Text style={styles.col23}>{l.actual}</Text>
                <Text style={styles.col24}>Variance</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.col30}>{l.material}</Text>
                <Text style={styles.col23}>{fmt(costs.materialProjected)}</Text>
                <Text style={styles.col23}>{fmt(costs.materialActual)}</Text>
                <Text style={styles.col24}>{fmt(costs.materialActual - costs.materialProjected)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.col30}>{l.labor}</Text>
                <Text style={styles.col23}>{fmt(costs.laborProjected)}</Text>
                <Text style={styles.col23}>{fmt(costs.laborActual)}</Text>
                <Text style={styles.col24}>{fmt(costs.laborActual - costs.laborProjected)}</Text>
              </View>
              <View style={styles.tableTotalRow}>
                <Text style={styles.col30}>{l.total}</Text>
                <Text style={styles.col23}>{fmt(totalProjected)}</Text>
                <Text style={styles.col23}>{fmt(totalActual)}</Text>
                <Text style={styles.col24}>{fmt(totalActual - totalProjected)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Commission */}
        {job.commission && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Commission</Text>
            <View style={styles.row}><Text style={styles.label}>Contract Value:</Text><Text style={styles.value}>{fmt(job.commission.contractValue)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Rate:</Text><Text style={styles.value}>{(job.commission.rate * 100).toFixed(0)}%</Text></View>
            <View style={styles.row}><Text style={styles.label}>Amount:</Text><Text style={styles.value}>{fmt(job.commission.amount)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Status:</Text><Text style={styles.value}>{job.commission.status.toUpperCase()}</Text></View>
          </View>
        )}

        {/* Final Payment */}
        {job.finalPayment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Final Payment</Text>
            <View style={styles.row}><Text style={styles.label}>Amount:</Text><Text style={styles.value}>{fmt(job.finalPayment.amount)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Method:</Text><Text style={styles.value}>{job.finalPayment.method.toUpperCase()}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Received:</Text><Text style={styles.value}>{fmtDate(job.finalPayment.receivedAt)}</Text></View>
            {job.finalPayment.referenceNumber && <View style={styles.row}><Text style={styles.label}>Reference #:</Text><Text style={styles.value}>{job.finalPayment.referenceNumber}</Text></View>}
          </View>
        )}

        <Text style={styles.footer}>Generated by {tenant.appName} | {new Date().toLocaleDateString()}</Text>
      </Page>

      {/* Page 2: Contracts & Addendums */}
      {(contracts.length > 0 || addendums.length > 0) && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.title}>{l.contractsAndAddendums} — {job.jobNumber}</Text>

          {contracts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{l.signedContracts} ({contracts.length})</Text>
              {contracts.map((c, i) => (
                <View key={i} style={{ marginBottom: 8, padding: 6, backgroundColor: '#fafafa', borderRadius: 4 }}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Document:</Text>
                    <Text style={styles.value}>{c.documentType === 'remodeling_agreement' ? 'Custom Remodeling Agreement' : 'Disclosure Statement'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Signed:</Text>
                    <Text style={styles.value}>{fmtDate(c.createdAt)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Buyer:</Text>
                    <Text style={styles.value}>{c.signatures?.buyer?.name}{c.signatures?.buyer2 ? `, ${c.signatures.buyer2.name}` : ''}</Text>
                  </View>
                  {c.formData?.purchasePrice && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Purchase Price:</Text>
                      <Text style={styles.value}>{fmt(c.formData.purchasePrice)}</Text>
                    </View>
                  )}
                  <View style={styles.row}>
                    <Text style={styles.label}>Status:</Text>
                    <Text style={styles.value}>{c.status.toUpperCase()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {addendums.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{l.addendums} ({addendums.length})</Text>
              {addendums.map((a, i) => (
                <View key={i} style={{ marginBottom: 8, padding: 6, backgroundColor: '#fafafa', borderRadius: 4 }}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Addendum #{a.addendumNumber}:</Text>
                    <Text style={styles.value}>{ADDENDUM_TYPE_LABELS[a.type]}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Description:</Text>
                    <Text style={styles.value}>{a.description}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Cost Impact:</Text>
                    <Text style={styles.value}>{a.costImpact === 0 ? 'No change' : fmt(a.costImpact)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Signed:</Text>
                    <Text style={styles.value}>{fmtDate(a.signedAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Completion Certificate */}
          {cert && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{l.completionCertificate}</Text>
              <View style={styles.row}><Text style={styles.label}>{l.customer}:</Text><Text style={styles.value}>{cert.customerName}</Text></View>
              <View style={styles.row}><Text style={styles.label}>{l.contractor}:</Text><Text style={styles.value}>{cert.contractorName || '—'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Signed:</Text><Text style={styles.value}>{fmtDate(cert.signedAt)}</Text></View>
              {cert.notes && <View style={styles.row}><Text style={styles.label}>Notes:</Text><Text style={styles.value}>{cert.notes}</Text></View>}
              {cert.customerSignatureUrl && cert.contractorSignatureUrl && (
                <View style={styles.signatureRow}>
                  <View style={styles.signatureBlock}>
                    <Image style={styles.signatureImage} src={cert.customerSignatureUrl} />
                    <Text style={styles.signatureLine}>{cert.customerName}</Text>
                    <Text style={styles.signatureDate}>Customer</Text>
                  </View>
                  <View style={styles.signatureBlock}>
                    <Image style={styles.signatureImage} src={cert.contractorSignatureUrl} />
                    <Text style={styles.signatureLine}>{cert.contractorName || 'Contractor'}</Text>
                    <Text style={styles.signatureDate}>Contractor</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <Text style={styles.footer}>Generated by {tenant.appName} | {new Date().toLocaleDateString()}</Text>
        </Page>
      )}

      {/* Page 3: Photos */}
      {(job.photos?.before?.length || job.photos?.after?.length) ? (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.title}>PHOTOS — {job.jobNumber}</Text>

          {job.photos?.before && job.photos.before.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Before Photos ({job.photos.before.length})</Text>
              <View style={styles.photoGrid}>
                {job.photos.before.map((photo, i) => (
                  <View key={i}>
                    <Image style={styles.photo} src={photo.url} />
                    <Text style={styles.photoCaption}>
                      {photo.caption || `Photo ${i + 1}`} — {fmtDate(photo.uploadedAt)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {job.photos?.after && job.photos.after.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>After Photos ({job.photos.after.length})</Text>
              <View style={styles.photoGrid}>
                {job.photos.after.map((photo, i) => (
                  <View key={i}>
                    <Image style={styles.photo} src={photo.url} />
                    <Text style={styles.photoCaption}>
                      {photo.caption || `Photo ${i + 1}`} — {fmtDate(photo.uploadedAt)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.footer}>Generated by {tenant.appName} | {new Date().toLocaleDateString()}</Text>
        </Page>
      ) : null}

      {/* Page 4: Communications */}
      {communications.length > 0 && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.title}>{l.communicationLog} — {job.jobNumber}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{l.communicationLog} ({communications.length})</Text>
            {communications.map((comm, i) => (
              <View key={i} style={styles.noteBlock}>
                <Text style={styles.noteHeader}>
                  {comm.type.toUpperCase()} — {fmtDate(comm.createdAt)}
                </Text>
                <Text style={styles.noteText}>{comm.content}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>Generated by {tenant.appName} | {new Date().toLocaleDateString()}</Text>
        </Page>
      )}

      {/* Page 5: Materials */}
      {job.materials && job.materials.length > 0 && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.title}>MATERIALS — {job.jobNumber}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materials ({job.materials.length})</Text>
            {job.materials.map((mat, i) => (
              <View key={i} style={{ marginBottom: 6, padding: 4, backgroundColor: i % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                <View style={styles.row}>
                  <Text style={styles.label}>{mat.name}</Text>
                  <Text style={styles.value}>Qty: {mat.quantity} | Est: {fmt(mat.estimatedCost)} | Actual: {mat.actualCost ? fmt(mat.actualCost) : '—'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Status:</Text>
                  <Text style={styles.value}>{mat.status.toUpperCase()}{mat.supplier ? ` | Supplier: ${mat.supplier}` : ''}{mat.orderNumber ? ` | Order: ${mat.orderNumber}` : ''}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>Generated by {tenant.appName} | {new Date().toLocaleDateString()}</Text>
        </Page>
      )}
    </Document>
  );
}
