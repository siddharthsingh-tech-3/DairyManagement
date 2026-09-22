import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import GroupsIcon from "@mui/icons-material/GroupsOutlined";
import ListAltIcon from "@mui/icons-material/ListAltOutlined";
import LocalShippingIcon from "@mui/icons-material/LocalShippingOutlined";
import Inventory2Icon from "@mui/icons-material/Inventory2Outlined";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongOutlined";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupeeOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCartOutlined";
import SellIcon from "@mui/icons-material/SellOutlined";
import ManageAccountsIcon from "@mui/icons-material/ManageAccountsOutlined";
import AssessmentIcon from "@mui/icons-material/AssessmentOutlined";
import FactCheckIcon from "@mui/icons-material/FactCheckOutlined";
import HandshakeIcon from "@mui/icons-material/HandshakeOutlined";
import AirportShuttleIcon from "@mui/icons-material/AirportShuttleOutlined";
import AccountBalanceIcon from "@mui/icons-material/AccountBalanceOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { PermissionFeature, UserRole } from "@/types/enums";

export interface NavChildItem {
  path: string;
  label: string;
}

export const NAV_CATEGORIES = [
  "General",
  "Accounting Solutions",
  "Order Management",
  "Business Tools",
] as const;

export type NavCategory = (typeof NAV_CATEGORIES)[number];

export interface NavItem {
  path: string;
  label: string;
  /** Per-role label override, matching the prototype's ordersLabel/deliveryLabel. */
  roleLabels?: Partial<Record<UserRole, string>>;
  icon: SvgIconComponent;
  feature: PermissionFeature | "dashboard";
  /** Sidebar section this item is grouped under. */
  category: NavCategory;
  /** Sub-tabs rendered as a collapsible group under this item, e.g. Purchases. */
  children?: NavChildItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    feature: "dashboard",
    category: "General",
  },
  {
    path: "/vendors",
    label: "Vendors",
    icon: GroupsIcon,
    feature: "vendors",
    category: "General",
  },
  {
    path: "/sales",
    label: "Sales",
    icon: SellIcon,
    feature: "sales",
    category: "General",
    children: [
      { path: "/sales/invoices", label: "Sales Invoice" },
      { path: "/sales/quotations", label: "Quotation/Estimate" },
      { path: "/sales/payments-in", label: "Payment In" },
      { path: "/sales/returns", label: "Sales Return" },
      { path: "/sales/credit-notes", label: "Credit Note" },
      { path: "/sales/delivery-challans", label: "Delivery Challan" },
      { path: "/sales/proforma-invoices", label: "Proforma Invoice" },
    ],
  },
  {
    path: "/purchases",
    label: "Purchases",
    icon: ShoppingCartIcon,
    feature: "purchases",
    category: "General",
    children: [
      { path: "/purchases/invoices", label: "Purchase Invoice" },
      { path: "/purchases/payments-out", label: "Payment Out" },
      { path: "/purchases/returns", label: "Purchase Return" },
      { path: "/purchases/debit-notes", label: "Debit Note" },
      { path: "/purchases/orders", label: "Purchase Order" },
    ],
  },
  {
    path: "/reports",
    label: "Reports & Audit",
    icon: AssessmentIcon,
    feature: "reports",
    category: "General",
  },
  {
    path: "/billing",
    label: "Billing & Accounts",
    icon: ReceiptLongIcon,
    feature: "billing",
    category: "Accounting Solutions",
  },
  {
    path: "/expenses",
    label: "Expenses",
    icon: CurrencyRupeeIcon,
    feature: "expenses",
    category: "Accounting Solutions",
  },
  {
    path: "/e-invoicing",
    label: "E-Invoicing",
    icon: FactCheckIcon,
    feature: "e_invoicing",
    category: "Accounting Solutions",
  },
  {
    path: "/products",
    label: "Products & Stock",
    icon: CategoryIcon,
    feature: "products",
    category: "Order Management",
  },
  {
    path: "/orders",
    label: "Demand Scheduling",
    roleLabels: { vendor: "My Orders" },
    icon: ListAltIcon,
    feature: "orders",
    category: "Order Management",
  },
  {
    path: "/delivery",
    label: "Delivery Management",
    roleLabels: { driver: "My Deliveries", vendor: "My Deliveries" },
    icon: LocalShippingIcon,
    feature: "delivery",
    category: "Order Management",
  },
  {
    path: "/crates",
    label: "Crate Management",
    icon: Inventory2Icon,
    feature: "crates",
    category: "Order Management",
  },
  {
    path: "/users",
    label: "Users & Access",
    icon: ManageAccountsIcon,
    feature: "user_access",
    category: "Business Tools",
  },
  {
    path: "/business-partners",
    label: "Business Partners",
    icon: HandshakeIcon,
    feature: "business_partners",
    category: "Business Tools",
  },
  {
    path: "/transport",
    label: "Transport",
    icon: AirportShuttleIcon,
    feature: "transport",
    category: "Business Tools",
  },
  {
    path: "/loans",
    label: "Loan Management",
    icon: AccountBalanceIcon,
    feature: "loans",
    category: "Business Tools",
  },
];
