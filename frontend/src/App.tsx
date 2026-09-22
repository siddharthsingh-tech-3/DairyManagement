import { Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PlatformLayout } from '@/layouts/PlatformLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { PermissionRoute } from '@/routes/PermissionRoute'
import { PlatformAdminRoute } from '@/routes/PlatformAdminRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { VendorsPage } from '@/pages/VendorsPage'
import { VendorDetailPage } from '@/pages/VendorDetailPage'
import { BulkAddVendorsPage } from '@/pages/BulkAddVendorsPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { ScheduleOrderPage } from '@/pages/ScheduleOrderPage'
import { DeliveryPage } from '@/pages/DeliveryPage'
import { CratesPage } from '@/pages/CratesPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { BillingPage } from '@/pages/BillingPage'
import { PurchasesOverviewPage } from '@/pages/purchases/PurchasesOverviewPage'
import { PurchaseInvoicesPage } from '@/pages/purchases/PurchaseInvoicesPage'
import { PurchaseInvoiceViewPage } from '@/pages/purchases/PurchaseInvoiceViewPage'
import { CreatePurchaseInvoicePage } from '@/pages/purchases/CreatePurchaseInvoicePage'
import { PurchaseOrdersPage } from '@/pages/purchases/PurchaseOrdersPage'
import { CreatePurchaseOrderPage } from '@/pages/purchases/CreatePurchaseOrderPage'
import { PaymentsOutPage } from '@/pages/purchases/PaymentsOutPage'
import { CreatePaymentOutPage } from '@/pages/purchases/CreatePaymentOutPage'
import { PaymentOutViewPage } from '@/pages/purchases/PaymentOutViewPage'
import { PurchaseReturnsPage } from '@/pages/purchases/PurchaseReturnsPage'
import { CreatePurchaseReturnPage } from '@/pages/purchases/CreatePurchaseReturnPage'
import { DebitNotesPage } from '@/pages/purchases/DebitNotesPage'
import { CreateDebitNotePage } from '@/pages/purchases/CreateDebitNotePage'
import { SalesTransactionReportPage } from '@/pages/SalesTransactionReportPage'
import { SalesInvoicesPage } from '@/pages/sales/SalesInvoicesPage'
import { CreateSalesInvoicePage } from '@/pages/sales/CreateSalesInvoicePage'
import { SalesInvoiceViewPage } from '@/pages/sales/SalesInvoiceViewPage'
import { QuotationsPage } from '@/pages/sales/QuotationsPage'
import { CreateQuotationPage } from '@/pages/sales/CreateQuotationPage'
import { PaymentsInPage } from '@/pages/sales/PaymentsInPage'
import { CreatePaymentInPage } from '@/pages/sales/CreatePaymentInPage'
import { PaymentInViewPage } from '@/pages/sales/PaymentInViewPage'
import { SalesReturnsPage } from '@/pages/sales/SalesReturnsPage'
import { CreateSalesReturnPage } from '@/pages/sales/CreateSalesReturnPage'
import { CreditNotesPage } from '@/pages/sales/CreditNotesPage'
import { CreateCreditNotePage } from '@/pages/sales/CreateCreditNotePage'
import { DeliveryChallansPage } from '@/pages/sales/DeliveryChallansPage'
import { CreateDeliveryChallanPage } from '@/pages/sales/CreateDeliveryChallanPage'
import { ProformaInvoicesPage } from '@/pages/sales/ProformaInvoicesPage'
import { CreateProformaInvoicePage } from '@/pages/sales/CreateProformaInvoicePage'
import { UsersPage } from '@/pages/UsersPage'
import { TenantsPage } from '@/pages/TenantsPage'
import { BusinessPartnersPage } from '@/pages/BusinessPartnersPage'
import { BusinessPartnerDetailPage } from '@/pages/BusinessPartnerDetailPage'
import { TransportPage } from '@/pages/TransportPage'
import { LoansPage } from '@/pages/LoansPage'
import { LoanDetailPage } from '@/pages/LoanDetailPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { CreateExpensePage } from '@/pages/CreateExpensePage'
import { EInvoicingPage } from '@/pages/EInvoicingPage'
import { GenerateEInvoicePage } from '@/pages/GenerateEInvoicePage'
import { ReportsPage } from '@/pages/ReportsPage'
import { BalanceSheetReportPage } from '@/pages/reports/BalanceSheetReportPage'
import { DaybookStaffWiseReportPage } from '@/pages/reports/DaybookStaffWiseReportPage'
import { StockSummaryReportPage } from '@/pages/reports/StockSummaryReportPage'
import { LowStockSummaryReportPage } from '@/pages/reports/LowStockSummaryReportPage'
import { ExpenseTransactionReportPage } from '@/pages/reports/ExpenseTransactionReportPage'
import { ExpenseCategoryReportPage } from '@/pages/reports/ExpenseCategoryReportPage'
import { ReportPlaceholderPage } from '@/pages/reports/ReportPlaceholderPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route element={<PermissionRoute feature="vendors" />}>
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/vendors/bulk-add" element={<BulkAddVendorsPage />} />
              <Route path="/vendors/:vendorId" element={<VendorDetailPage />} />
            </Route>
            <Route element={<PermissionRoute feature="orders" />}>
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/schedule" element={<ScheduleOrderPage />} />
            </Route>
            <Route element={<PermissionRoute feature="delivery" />}>
              <Route path="/delivery" element={<DeliveryPage />} />
            </Route>
            <Route element={<PermissionRoute feature="crates" />}>
              <Route path="/crates" element={<CratesPage />} />
            </Route>
            <Route element={<PermissionRoute feature="products" />}>
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
            </Route>
            <Route element={<PermissionRoute feature="billing" />}>
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/reports/sales-transactions" element={<SalesTransactionReportPage />} />
            </Route>
            <Route element={<PermissionRoute feature="sales" />}>
              <Route path="/sales" element={<Navigate to="/sales/invoices" replace />} />
              <Route path="/sales/invoices" element={<SalesInvoicesPage />} />
              <Route path="/sales/invoices/new" element={<CreateSalesInvoicePage />} />
              <Route path="/sales/invoices/:invoiceId" element={<SalesInvoiceViewPage />} />
              <Route path="/sales/quotations" element={<QuotationsPage />} />
              <Route path="/sales/quotations/new" element={<CreateQuotationPage />} />
              <Route path="/sales/payments-in" element={<PaymentsInPage />} />
              <Route path="/sales/payments-in/new" element={<CreatePaymentInPage />} />
              <Route path="/sales/payments-in/:paymentId" element={<PaymentInViewPage />} />
              <Route path="/sales/returns" element={<SalesReturnsPage />} />
              <Route path="/sales/returns/new" element={<CreateSalesReturnPage />} />
              <Route path="/sales/credit-notes" element={<CreditNotesPage />} />
              <Route path="/sales/credit-notes/new" element={<CreateCreditNotePage />} />
              <Route path="/sales/delivery-challans" element={<DeliveryChallansPage />} />
              <Route path="/sales/delivery-challans/new" element={<CreateDeliveryChallanPage />} />
              <Route path="/sales/proforma-invoices" element={<ProformaInvoicesPage />} />
              <Route path="/sales/proforma-invoices/new" element={<CreateProformaInvoicePage />} />
            </Route>
            <Route element={<PermissionRoute feature="purchases" />}>
              <Route path="/purchases" element={<PurchasesOverviewPage />} />
              <Route path="/purchases/invoices" element={<PurchaseInvoicesPage />} />
              <Route path="/purchases/invoices/new" element={<CreatePurchaseInvoicePage />} />
              <Route path="/purchases/invoices/:invoiceId" element={<PurchaseInvoiceViewPage />} />
              <Route path="/purchases/orders" element={<PurchaseOrdersPage />} />
              <Route path="/purchases/orders/new" element={<CreatePurchaseOrderPage />} />
              <Route path="/purchases/payments-out" element={<PaymentsOutPage />} />
              <Route path="/purchases/payments-out/new" element={<CreatePaymentOutPage />} />
              <Route path="/purchases/payments-out/:paymentId" element={<PaymentOutViewPage />} />
              <Route path="/purchases/returns" element={<PurchaseReturnsPage />} />
              <Route path="/purchases/returns/new" element={<CreatePurchaseReturnPage />} />
              <Route path="/purchases/debit-notes" element={<DebitNotesPage />} />
              <Route path="/purchases/debit-notes/new" element={<CreateDebitNotePage />} />
            </Route>
            <Route element={<PermissionRoute feature="user_access" />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
            <Route element={<PermissionRoute feature="business_partners" />}>
              <Route path="/business-partners" element={<BusinessPartnersPage />} />
              <Route path="/business-partners/:partnerId" element={<BusinessPartnerDetailPage />} />
            </Route>
            <Route element={<PermissionRoute feature="transport" />}>
              <Route path="/transport" element={<TransportPage />} />
            </Route>
            <Route element={<PermissionRoute feature="loans" />}>
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/loans/:loanId" element={<LoanDetailPage />} />
            </Route>
            <Route element={<PermissionRoute feature="expenses" />}>
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/expenses/new" element={<CreateExpensePage />} />
              <Route path="/reports/expense-transaction-report" element={<ExpenseTransactionReportPage />} />
              <Route path="/reports/expense-category-report" element={<ExpenseCategoryReportPage />} />
            </Route>
            <Route element={<PermissionRoute feature="e_invoicing" />}>
              <Route path="/e-invoicing" element={<EInvoicingPage />} />
              <Route path="/e-invoicing/generate/:type/:id" element={<GenerateEInvoicePage />} />
            </Route>
            <Route element={<PermissionRoute feature="reports" />}>
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reports/balance-sheet" element={<BalanceSheetReportPage />} />
              <Route path="/reports/daybook-staff-wise" element={<DaybookStaffWiseReportPage />} />
              <Route path="/reports/stock-summary" element={<StockSummaryReportPage />} />
              <Route path="/reports/low-stock-summary" element={<LowStockSummaryReportPage />} />
              <Route path="/reports/:slug" element={<ReportPlaceholderPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route element={<PlatformAdminRoute />}>
            <Route element={<PlatformLayout />}>
              <Route path="/platform/tenants" element={<TenantsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
