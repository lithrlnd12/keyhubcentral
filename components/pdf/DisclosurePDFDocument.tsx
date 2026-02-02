'use client';

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { ContractFormData } from '@/types/contract';

// Disclosure-specific styles
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
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    textDecoration: 'underline',
  },
  paragraph: {
    marginBottom: 10,
    lineHeight: 1.4,
    textAlign: 'justify',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 10,
  },
  bullet: {
    width: 15,
  },
  bulletText: {
    flex: 1,
    lineHeight: 1.4,
  },
  numberedItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  itemNumber: {
    width: 25,
    fontFamily: 'Helvetica-Bold',
  },
  itemText: {
    flex: 1,
    lineHeight: 1.4,
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    height: 50,
    marginBottom: 4,
  },
  signatureImage: {
    height: 50,
    objectFit: 'contain',
  },
  dateLine: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dateLabel: {
    fontSize: 9,
    marginRight: 4,
  },
  dateValue: {
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    flex: 1,
    paddingBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 15,
    right: 40,
    fontSize: 8,
    color: '#666666',
  },
  infoBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 10,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    flex: 1,
  },
  legalNotice: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  legalText: {
    fontSize: 9,
    fontStyle: 'italic',
    lineHeight: 1.3,
  },
});

interface DisclosurePDFDocumentProps {
  formData: ContractFormData;
  signatures: {
    buyerUrl?: string;
    buyerName?: string;
    buyer2Url?: string;
    buyer2Name?: string;
  };
}

export function DisclosurePDFDocument({
  formData,
  signatures,
}: DisclosurePDFDocumentProps) {
  const formatDate = (date: Date | null): string => {
    if (!date) return '_________________';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const signedDate = formatDate(new Date());

  return (
    <Document>
      {/* Page 1: Header and Introduction */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>TEXAS PROPERTY CODE</Text>
          <Text style={styles.subtitle}>DISCLOSURE STATEMENT</Text>
          <Text style={{ fontSize: 9 }}>
            Required by Section 27.007, Texas Property Code
          </Text>
        </View>

        {/* Property Information */}
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Property Address:</Text>
            <Text style={styles.value}>
              {formData.address.street}, {formData.address.city}, {formData.address.state}{' '}
              {formData.address.zip}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Property Owner:</Text>
            <Text style={styles.value}>
              {formData.buyerName}
              {formData.buyerName2 ? ` and ${formData.buyerName2}` : ''}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contract Date:</Text>
            <Text style={styles.value}>{formatDate(formData.contractDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTICE TO PROPERTY OWNER</Text>
          <Text style={styles.paragraph}>
            This disclosure statement is provided to you as required by Texas law. It contains
            important information about your rights and the contractor&apos;s obligations under
            Texas law. Please read this document carefully before signing any contract for home
            improvement work.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REQUIRED DISCLOSURES</Text>

          <View style={styles.numberedItem}>
            <Text style={styles.itemNumber}>1.</Text>
            <Text style={styles.itemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>RIGHT TO CANCEL: </Text>
              You have the right to cancel any home improvement contract within three (3) business
              days after signing if the contract was solicited at your residence. This right cannot
              be waived.
            </Text>
          </View>

          <View style={styles.numberedItem}>
            <Text style={styles.itemNumber}>2.</Text>
            <Text style={styles.itemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>WRITTEN CONTRACT: </Text>
              All home improvement contracts exceeding $1,000 must be in writing. The contract must
              include the contractor&apos;s name, address, and any license or registration numbers
              required by law.
            </Text>
          </View>

          <View style={styles.numberedItem}>
            <Text style={styles.itemNumber}>3.</Text>
            <Text style={styles.itemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>PAYMENT SCHEDULE: </Text>
              You should not make final payment until the work is completed to your satisfaction.
              The contractor may not require payment of more than one-third of the contract price
              as a down payment.
            </Text>
          </View>

          <View style={styles.numberedItem}>
            <Text style={styles.itemNumber}>4.</Text>
            <Text style={styles.itemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>MECHANIC&apos;S LIENS: </Text>
              Subcontractors and material suppliers who are not paid may file a lien against your
              property. You may protect yourself by obtaining lien waivers from all parties who
              provide labor or materials.
            </Text>
          </View>

          <View style={styles.numberedItem}>
            <Text style={styles.itemNumber}>5.</Text>
            <Text style={styles.itemText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>PERMITS: </Text>
              Many home improvement projects require permits from local building authorities.
              Working without required permits may result in fines and may affect your ability to
              sell the property.
            </Text>
          </View>
        </View>

        <Text style={styles.pageNumber}>Page 1 of 4</Text>
      </Page>

      {/* Page 2: Continued Disclosures and Signature */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>REQUIRED DISCLOSURES (Continued)</Text>

        <View style={styles.numberedItem}>
          <Text style={styles.itemNumber}>6.</Text>
          <Text style={styles.itemText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>INSURANCE: </Text>
            You should verify that the contractor carries adequate liability insurance and
            workers&apos; compensation insurance. Request certificates of insurance and verify
            coverage is current.
          </Text>
        </View>

        <View style={styles.numberedItem}>
          <Text style={styles.itemNumber}>7.</Text>
          <Text style={styles.itemText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>WARRANTIES: </Text>
            Ask about warranties on both workmanship and materials. Get all warranty terms in
            writing as part of your contract.
          </Text>
        </View>

        <View style={styles.numberedItem}>
          <Text style={styles.itemNumber}>8.</Text>
          <Text style={styles.itemText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>CHANGE ORDERS: </Text>
            Any changes to the original contract should be documented in writing, signed by both
            parties, and should specify any additional costs or time required.
          </Text>
        </View>

        <View style={styles.numberedItem}>
          <Text style={styles.itemNumber}>9.</Text>
          <Text style={styles.itemText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>DISPUTE RESOLUTION: </Text>
            If a dispute arises, you may have rights under the Texas Residential Construction
            Liability Act (Chapter 27, Texas Property Code). This law provides specific procedures
            that must be followed before filing a lawsuit.
          </Text>
        </View>

        <View style={styles.numberedItem}>
          <Text style={styles.itemNumber}>10.</Text>
          <Text style={styles.itemText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>CONSUMER PROTECTION: </Text>
            The Texas Deceptive Trade Practices Act may provide additional protections against
            false, misleading, or deceptive acts or practices. Contact the Texas Attorney
            General&apos;s office for more information.
          </Text>
        </View>

        <View style={styles.legalNotice}>
          <Text style={styles.legalText}>
            NOTICE: This disclosure is required by Texas law and is not a substitute for legal
            advice. If you have questions about your rights or the contractor&apos;s obligations,
            consult with an attorney.
          </Text>
        </View>

        {/* Buyer Acknowledgment and Signatures */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>PROPERTY OWNER ACKNOWLEDGMENT</Text>
          <Text style={styles.paragraph}>
            By signing below, I/we acknowledge that I/we have received a copy of this Disclosure
            Statement, have read and understand its contents, and have had the opportunity to ask
            questions about the information provided.
          </Text>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Property Owner Signature</Text>
            {signatures.buyerUrl ? (
              /* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image doesn't support alt */
              <Image src={signatures.buyerUrl} style={styles.signatureImage} />
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={{ fontSize: 9 }}>{signatures.buyerName || formData.buyerName}</Text>
            <View style={styles.dateLine}>
              <Text style={styles.dateLabel}>Date:</Text>
              <Text style={styles.dateValue}>{signedDate}</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            {(formData.buyerName2 || signatures.buyer2Url) && (
              <>
                <Text style={styles.signatureLabel}>Property Owner 2 Signature</Text>
                {signatures.buyer2Url ? (
                  /* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image doesn't support alt */
                  <Image src={signatures.buyer2Url} style={styles.signatureImage} />
                ) : (
                  <View style={styles.signatureLine} />
                )}
                <Text style={{ fontSize: 9 }}>{signatures.buyer2Name || formData.buyerName2}</Text>
                <View style={styles.dateLine}>
                  <Text style={styles.dateLabel}>Date:</Text>
                  <Text style={styles.dateValue}>{signedDate}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <Text style={styles.pageNumber}>Page 2 of 4</Text>
      </Page>

      {/* Page 3: Texas Residential Construction Liability Act */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>TEXAS RESIDENTIAL CONSTRUCTION LIABILITY ACT</Text>
        <Text style={styles.subtitle}>Notice Required Under Chapter 27, Texas Property Code</Text>

        <Text style={styles.paragraph}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>IMPORTANT NOTICE: </Text>
          Chapter 27 of the Texas Property Code (the Residential Construction Liability Act or
          &quot;RCLA&quot;) governs your rights and obligations as a homeowner regarding
          construction defects. The following is a summary of key provisions:
        </Text>

        <View style={styles.section}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>
            BEFORE FILING A LAWSUIT:
          </Text>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>1.</Text>
            <Text style={styles.bulletText}>
              You must give written notice to the contractor at least 60 days before filing a
              lawsuit for a construction defect. The notice must describe the nature of the defect
              in reasonable detail.
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>2.</Text>
            <Text style={styles.bulletText}>
              The contractor has 35 days to inspect the property after receiving your notice.
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>3.</Text>
            <Text style={styles.bulletText}>
              Within 45 days of receiving notice, the contractor must make a written settlement
              offer or explain why the defect is not the contractor&apos;s responsibility.
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>4.</Text>
            <Text style={styles.bulletText}>
              If a settlement offer is made, you have 25 days to accept or reject it.
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>5.</Text>
            <Text style={styles.bulletText}>
              If you reject the offer, you may proceed with filing a lawsuit, but the
              contractor&apos;s offer may be admitted as evidence.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>
            LIMITATIONS ON DAMAGES:
          </Text>

          <Text style={styles.paragraph}>
            The RCLA limits the types of damages you may recover in a construction defect lawsuit.
            Generally, you may recover:
          </Text>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              The reasonable cost of repairs necessary to cure the defect
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              The reduction in market value if the defect cannot be cured
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Reasonable and necessary engineering and consulting fees
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Temporary housing costs if the home is uninhabitable during repairs
            </Text>
          </View>
        </View>

        <View style={styles.legalNotice}>
          <Text style={styles.legalText}>
            This is a summary only. The actual statutory requirements may differ. Consult the full
            text of Chapter 27, Texas Property Code, or an attorney for complete information about
            your rights and obligations.
          </Text>
        </View>

        <Text style={styles.pageNumber}>Page 3 of 4</Text>
      </Page>

      {/* Page 4: Additional Information and Final Acknowledgment */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>ADDITIONAL CONSUMER PROTECTIONS</Text>

        <View style={styles.section}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>
            TEXAS DECEPTIVE TRADE PRACTICES ACT (DTPA):
          </Text>
          <Text style={styles.paragraph}>
            The DTPA provides additional protections against contractors who engage in false,
            misleading, or deceptive acts or practices. Remedies under the DTPA may include
            economic damages, mental anguish damages (in certain cases), and attorney&apos;s fees.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>
            MECHANIC&apos;S AND MATERIALMAN&apos;S LIEN LAW:
          </Text>
          <Text style={styles.paragraph}>
            Under Texas law, contractors, subcontractors, and material suppliers who provide labor
            or materials for improvements to your property may have the right to file a lien
            against your property if they are not paid. To protect yourself:
          </Text>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Request lien waivers from the contractor and all subcontractors
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Consider using joint checks payable to the contractor and suppliers
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Do not make final payment until you receive all lien waivers
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>
            RESOURCES:
          </Text>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Texas Attorney General Consumer Protection: (800) 621-0508
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Texas Department of Licensing and Regulation: (800) 803-9202
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Better Business Bureau of Texas: www.bbb.org
            </Text>
          </View>
        </View>

        <View style={[styles.infoBox, { marginTop: 20 }]}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 10, textAlign: 'center' }}>
            FINAL ACKNOWLEDGMENT
          </Text>
          <Text style={styles.paragraph}>
            I/We, the undersigned property owner(s), acknowledge receipt of this complete
            Disclosure Statement consisting of four (4) pages. I/We have been given the opportunity
            to read this document in its entirety and ask questions. I/We understand that this
            disclosure is provided for informational purposes and does not constitute legal advice.
          </Text>
          <View style={{ marginTop: 15 }}>
            <View style={styles.row}>
              <Text style={styles.label}>Property Owner:</Text>
              <Text style={styles.value}>{formData.buyerName}</Text>
            </View>
            {formData.buyerName2 && (
              <View style={styles.row}>
                <Text style={styles.label}>Property Owner 2:</Text>
                <Text style={styles.value}>{formData.buyerName2}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{signedDate}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Key Renovations | Professional Home Remodeling Services | Licensed and Insured
        </Text>
        <Text style={styles.pageNumber}>Page 4 of 4</Text>
      </Page>
    </Document>
  );
}
