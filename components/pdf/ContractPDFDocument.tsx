'use client';

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { ContractFormData } from '@/types/contract';

// Contract-specific styles
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
  title: {
    fontSize: 14,
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
    textDecoration: 'underline',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 2,
  },
  inlineRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  inlineLabel: {
    marginRight: 4,
  },
  inlineValue: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingHorizontal: 8,
    marginRight: 8,
  },
  paragraph: {
    marginBottom: 10,
    lineHeight: 1.4,
    textAlign: 'justify',
  },
  checkboxRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#000000',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
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
  // Notice of Cancellation styles
  noticeBox: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 15,
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 15,
    textDecoration: 'underline',
  },
  noticeText: {
    marginBottom: 10,
    lineHeight: 1.5,
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
  initialLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  initialBox: {
    width: 50,
    height: 25,
    borderWidth: 1,
    borderColor: '#000000',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
  },
  termsText: {
    fontSize: 9,
    lineHeight: 1.4,
    marginBottom: 8,
    textAlign: 'justify',
  },
  termsList: {
    paddingLeft: 15,
    marginBottom: 10,
  },
});

interface ContractPDFDocumentProps {
  formData: ContractFormData;
  signatures: {
    salesRepUrl?: string;
    salesRepName?: string;
    buyerUrl?: string;
    buyerName?: string;
    buyer2Url?: string;
    buyer2Name?: string;
    cancellationUrl?: string;
  };
  initials?: {
    leadHazardUrl?: string;
    termsAcknowledgmentUrl?: string;
  };
  salesRepName: string;
}

export function ContractPDFDocument({
  formData,
  signatures,
  initials,
  salesRepName,
}: ContractPDFDocumentProps) {
  const formatDate = (date: Date | null): string => {
    if (!date) return '_________________';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isPaymentMethodSelected = (method: string): boolean => {
    return formData.paymentMethods.includes(method as any);
  };

  const signedDate = formatDate(new Date());

  return (
    <Document>
      {/* Page 1: Contract Header and Details */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>Key Renovations</Text>
          <Text style={{ fontSize: 9, color: '#666666' }}>
            Professional Home Remodeling Services
          </Text>
        </View>

        <Text style={styles.title}>CUSTOM REMODELING AGREEMENT</Text>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Buyer Name:</Text>
            <Text style={styles.value}>{formData.buyerName}</Text>
          </View>
          {formData.buyerName2 && (
            <View style={styles.row}>
              <Text style={styles.label}>Buyer Name 2:</Text>
              <Text style={styles.value}>{formData.buyerName2}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Property Address:</Text>
            <Text style={styles.value}>
              {formData.address.street}, {formData.address.city}, {formData.address.state}{' '}
              {formData.address.zip}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Home Phone:</Text>
            <Text style={styles.value}>{formData.homePhone || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cell Phone:</Text>
            <Text style={styles.value}>{formData.cellPhone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{formData.email}</Text>
          </View>
        </View>

        {/* Project Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Contract Date:</Text>
            <Text style={styles.value}>{formatDate(formData.contractDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Est. Start Date:</Text>
            <Text style={styles.value}>{formatDate(formData.estimatedStartDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Est. Completion:</Text>
            <Text style={styles.value}>{formData.estimatedCompletionTime || 'To be determined'}</Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing and Payment</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Purchase Price:</Text>
            <Text style={styles.value}>{formatCurrency(formData.purchasePrice)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Down Payment:</Text>
            <Text style={styles.value}>{formatCurrency(formData.downPayment)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Balance Due:</Text>
            <Text style={styles.value}>{formatCurrency(formData.balanceDue)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method(s)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={[styles.checkboxRow, { width: '25%' }]}>
              <View style={styles.checkbox}>
                {isPaymentMethodSelected('cash') && <Text style={styles.checkboxChecked}>X</Text>}
              </View>
              <Text>Cash</Text>
            </View>
            <View style={[styles.checkboxRow, { width: '25%' }]}>
              <View style={styles.checkbox}>
                {isPaymentMethodSelected('check') && <Text style={styles.checkboxChecked}>X</Text>}
              </View>
              <Text>Check</Text>
            </View>
            <View style={[styles.checkboxRow, { width: '25%' }]}>
              <View style={styles.checkbox}>
                {isPaymentMethodSelected('card') && <Text style={styles.checkboxChecked}>X</Text>}
              </View>
              <Text>Credit/Debit</Text>
            </View>
            <View style={[styles.checkboxRow, { width: '25%' }]}>
              <View style={styles.checkbox}>
                {isPaymentMethodSelected('financing') && <Text style={styles.checkboxChecked}>X</Text>}
              </View>
              <Text>Financing</Text>
            </View>
          </View>
          {isPaymentMethodSelected('other') && formData.otherPaymentMethod && (
            <View style={styles.row}>
              <Text style={styles.label}>Other:</Text>
              <Text style={styles.value}>{formData.otherPaymentMethod}</Text>
            </View>
          )}
        </View>

        {/* Lead Hazard Acknowledgment */}
        <View style={styles.section}>
          <Text style={styles.paragraph}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Lead-Based Paint Disclosure: </Text>
            For homes built before 1978, buyer acknowledges receipt of EPA pamphlet &quot;Protect Your
            Family From Lead in Your Home&quot; and any known lead-based paint hazard information.
          </Text>
          <View style={styles.initialLine}>
            <Text>Buyer Initials: </Text>
            {initials?.leadHazardUrl ? (
              <Image src={initials.leadHazardUrl} style={{ width: 60, height: 30, objectFit: 'contain' }} />
            ) : (
              <View style={styles.initialBox}>
                <Text>{formData.leadHazardInitials || ''}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Sales Representative Signature</Text>
            {signatures.salesRepUrl ? (
              <Image src={signatures.salesRepUrl} style={styles.signatureImage} />
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={{ fontSize: 9 }}>{signatures.salesRepName || salesRepName}</Text>
            <View style={styles.dateLine}>
              <Text style={styles.dateLabel}>Date:</Text>
              <Text style={styles.dateValue}>{signedDate}</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Buyer Signature</Text>
            {signatures.buyerUrl ? (
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
        </View>

        {formData.buyerName2 && (
          <View style={[styles.signatureSection, { marginTop: 20 }]}>
            <View style={styles.signatureBlock}>
              {/* Empty for alignment */}
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Buyer 2 Signature</Text>
              {signatures.buyer2Url ? (
                <Image src={signatures.buyer2Url} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureLine} />
              )}
              <Text style={{ fontSize: 9 }}>{signatures.buyer2Name || formData.buyerName2}</Text>
              <View style={styles.dateLine}>
                <Text style={styles.dateLabel}>Date:</Text>
                <Text style={styles.dateValue}>{signedDate}</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.pageNumber}>Page 1 of 5</Text>
      </Page>

      {/* Page 2: Notice of Cancellation */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>NOTICE OF CANCELLATION</Text>

          <Text style={styles.noticeText}>
            Date of Transaction: {formatDate(formData.contractDate)}
          </Text>

          <Text style={styles.noticeText}>
            You may CANCEL this transaction, without any Penalty or Obligation, within THREE
            BUSINESS DAYS from the above date.
          </Text>

          <Text style={styles.noticeText}>
            If you cancel, any property traded in, any payments made by you under the contract or
            sale, and any negotiable instrument executed by you will be returned within TEN BUSINESS
            DAYS following receipt by the seller of your cancellation notice, and any security
            interest arising out of the transaction will be cancelled.
          </Text>

          <Text style={styles.noticeText}>
            If you cancel, you must make available to the seller at your residence, in substantially
            as good condition as when received, any goods delivered to you under this contract or
            sale, or you may, if you wish, comply with the instructions of the seller regarding the
            return shipment of the goods at the seller&apos;s expense and risk.
          </Text>

          <Text style={styles.noticeText}>
            If you do make the goods available to the seller and the seller does not pick them up
            within 20 days of the date of your notice of cancellation, you may retain or dispose of
            the goods without any further obligation.
          </Text>

          <Text style={styles.noticeText}>
            To cancel this transaction, mail or deliver a signed and dated copy of this cancellation
            notice or any other written notice, or send a telegram, to:
          </Text>

          <View style={{ marginVertical: 10, paddingLeft: 20 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Key Renovations</Text>
            <Text>Attn: Customer Service</Text>
            <Text>support@keyrenovations.com</Text>
          </View>

          <Text style={styles.noticeText}>NOT LATER THAN MIDNIGHT OF _________________</Text>

          <Text style={[styles.noticeText, { marginTop: 15, fontFamily: 'Helvetica-Bold' }]}>
            I HEREBY CANCEL THIS TRANSACTION.
          </Text>

          <View style={[styles.signatureSection, { marginTop: 20 }]}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Buyer Signature</Text>
              {signatures.cancellationUrl ? (
                <Image src={signatures.cancellationUrl} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureLine} />
              )}
              <View style={styles.dateLine}>
                <Text style={styles.dateLabel}>Date:</Text>
                <Text style={styles.dateValue}>{signedDate}</Text>
              </View>
            </View>
            <View style={styles.signatureBlock}>
              {/* Empty block for alignment */}
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Customer acknowledges receipt of a copy of this Notice of Cancellation form.
        </Text>
        <Text style={styles.pageNumber}>Page 2 of 5</Text>
      </Page>

      {/* Page 3: Terms and Conditions Part 1 */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.termsTitle}>TERMS AND CONDITIONS</Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>1. SCOPE OF WORK: </Text>
          Contractor agrees to furnish all labor, materials, equipment, and services necessary to
          complete the remodeling work as described in the attached specifications and drawings (if
          any). Any changes to the scope of work must be agreed upon in writing by both parties.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>2. PAYMENT TERMS: </Text>
          The down payment is due upon signing of this agreement. The balance shall be due upon
          substantial completion of the work, unless otherwise specified. Contractor reserves the
          right to request progress payments for projects exceeding 30 days in duration.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>3. CHANGE ORDERS: </Text>
          Any additional work or changes to the original scope must be documented in a written
          change order, signed by both parties, specifying the additional cost and/or time required.
          No verbal agreements will be binding.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>4. PERMITS AND INSPECTIONS: </Text>
          Contractor will obtain all necessary permits and arrange for required inspections, unless
          otherwise agreed. Permit fees are included in the contract price unless otherwise stated.
          Customer agrees to provide reasonable access for inspections.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>5. PROJECT TIMELINE: </Text>
          The estimated start date and completion time are approximate and may be affected by
          factors including but not limited to: permit delays, material availability, weather
          conditions, customer-requested changes, and unforeseen site conditions. Contractor will
          communicate any significant delays promptly.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>6. SITE ACCESS AND CONDITIONS: </Text>
          Customer agrees to provide contractor with reasonable access to the work area during
          normal working hours. Customer is responsible for clearing the work area of personal
          belongings and valuables. Contractor is not responsible for damage to items left in the
          work area.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>7. UTILITIES: </Text>
          Customer agrees to provide access to electricity and water at no charge to the contractor
          for the duration of the project.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>8. CONCEALED CONDITIONS: </Text>
          If conditions are discovered that were not visible or reasonably inferable prior to
          commencement of work (such as hidden water damage, mold, structural defects, or hazardous
          materials), contractor will notify customer immediately. Additional work required to
          address such conditions will be handled as a change order.
        </Text>

        <Text style={styles.pageNumber}>Page 3 of 5</Text>
      </Page>

      {/* Page 4: Terms and Conditions Part 2 */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.termsTitle}>TERMS AND CONDITIONS (Continued)</Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>9. WARRANTY: </Text>
          Contractor warrants all workmanship for a period of one (1) year from the date of
          substantial completion. This warranty covers defects in workmanship and does not cover
          normal wear and tear, misuse, or acts of God. Manufacturer warranties apply to materials
          and fixtures as specified by their respective manufacturers.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>10. INSURANCE: </Text>
          Contractor maintains general liability insurance and workers&apos; compensation insurance
          as required by law. Certificates of insurance are available upon request. Customer is
          responsible for maintaining adequate homeowner&apos;s insurance during the project.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>11. CLEAN-UP: </Text>
          Contractor will perform daily cleanup of the work area to maintain a reasonably clean and
          safe environment. Final cleanup, including removal of all construction debris, will be
          performed upon completion of the work.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>12. DISPUTES: </Text>
          In the event of a dispute arising from this agreement, both parties agree to first attempt
          to resolve the matter through good faith negotiation. If negotiation fails, the parties
          agree to submit to mediation before pursuing any legal action. This agreement shall be
          governed by the laws of the State of Texas.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>13. TERMINATION: </Text>
          Either party may terminate this agreement upon written notice. If customer terminates
          without cause, customer shall pay for all work completed to date, materials ordered, and
          reasonable overhead. If contractor terminates due to non-payment or breach by customer,
          the same provisions apply.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>14. ENTIRE AGREEMENT: </Text>
          This agreement, including all attachments and change orders, constitutes the entire
          agreement between the parties. Any prior discussions, negotiations, or representations not
          included herein are superseded by this document.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>15. SEVERABILITY: </Text>
          If any provision of this agreement is found to be invalid or unenforceable, the remaining
          provisions shall continue in full force and effect.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>16. ASSIGNMENT: </Text>
          Neither party may assign this agreement without the written consent of the other party,
          except that contractor may assign to a qualified subcontractor for specific portions of
          the work.
        </Text>

        <Text style={styles.pageNumber}>Page 4 of 5</Text>
      </Page>

      {/* Page 5: Terms and Conditions Part 3 + Final Acknowledgment */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.termsTitle}>TERMS AND CONDITIONS (Continued)</Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>17. FORCE MAJEURE: </Text>
          Neither party shall be liable for delays or failures in performance resulting from acts
          beyond their reasonable control, including but not limited to natural disasters,
          pandemics, government actions, labor disputes, or material shortages.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>18. PHOTOGRAPHS: </Text>
          Contractor may photograph the completed project for use in marketing and portfolio
          materials. Customer may opt out of this provision by notifying contractor in writing.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>19. COMMUNICATION: </Text>
          Both parties agree to maintain open communication throughout the project. Customer
          designates the primary contact listed on this agreement for all project-related
          communications.
        </Text>

        <Text style={styles.termsText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>20. FINAL INSPECTION: </Text>
          Upon completion, contractor will schedule a final walkthrough with customer. Customer
          agrees to participate in the walkthrough and identify any items requiring attention before
          final payment. A punch list of minor items will be completed within a reasonable
          timeframe.
        </Text>

        <View style={{ marginTop: 30, padding: 15, borderWidth: 1, borderColor: '#000000' }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 10 }}>
            ACKNOWLEDGMENT
          </Text>
          <Text style={styles.termsText}>
            By signing this agreement, customer acknowledges that they have read, understood, and
            agree to all terms and conditions stated herein. Customer has had the opportunity to ask
            questions and seek independent advice. Customer acknowledges receipt of a complete copy
            of this signed agreement.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <Text style={[styles.termsText, { fontFamily: 'Helvetica-Bold', marginRight: 10 }]}>
              Customer initials:
            </Text>
            {initials?.termsAcknowledgmentUrl ? (
              <Image src={initials.termsAcknowledgmentUrl} style={{ width: 60, height: 30, objectFit: 'contain' }} />
            ) : (
              <Text style={styles.termsText}>________</Text>
            )}
            <Text style={[styles.termsText, { marginLeft: 20, fontFamily: 'Helvetica-Bold' }]}>
              Date: {signedDate}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Key Renovations | Professional Home Remodeling Services | Licensed and Insured
        </Text>
        <Text style={styles.pageNumber}>Page 5 of 5</Text>
      </Page>
    </Document>
  );
}
