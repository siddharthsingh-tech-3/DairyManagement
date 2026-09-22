import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Grid2 as Grid,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useAuthStore } from "@/store/authStore";
import { getDashboard } from "@/api/reports";
import { listOrders } from "@/api/orders";
import { listDeliveries } from "@/api/deliveries";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingScreen } from "@/components/LoadingScreen";
import { FinancialOverview } from "@/features/dashboard/FinancialOverview";
import { AggregatedDemandCard } from "@/features/dashboard/AggregatedDemandCard";
import { NeedsAttentionCard } from "@/features/dashboard/NeedsAttentionCard";
import { formatCompactCurrency } from "@/utils/format";
import { brand } from "@/theme/theme";
import type {
  AdminDashboard,
  DriverDashboard,
  VendorDashboard,
} from "@/types/models";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <LoadingScreen />;

  if (user.role === "super_admin") return <AdminDashboardView />;
  if (user.role === "vendor") return <VendorDashboardView />;
  return <DriverDashboardView />;
}

function AdminDashboardView() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard<AdminDashboard>(),
  });
  if (isLoading || !data) return <LoadingScreen />;

  const firstName = user?.full_name.split(" ")[0] ?? "";

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          Good morning{firstName ? `, ${firstName}` : ""} 👋
        </Typography>
        <Typography color="text.secondary">
          {dayjs().format("dddd, D MMMM YYYY")} · distribution overview
        </Typography>
      </Box>
      {/* Aligned one after the other in a single row — scrolls horizontally on
          narrow screens instead of wrapping into a staggered multi-row grid. */}
      <Stack direction="row" spacing={2} sx={{ overflowX: "auto", pb: 0.5 }}>
        <Box sx={{ minWidth: 210, flex: 1 }}>
          <StatCard
            label="Today's demand"
            value={`${data.todays_demand_qty} pkt`}
            topBorderColor={brand.mint}
          />
        </Box>
        <Box sx={{ minWidth: 210, flex: 1 }}>
          <StatCard
            label="In transit"
            value={`${data.trucks_in_transit} trucks`}
            hint="dispatched today"
            topBorderColor={brand.mint}
          />
        </Box>
        <Box sx={{ minWidth: 210, flex: 1 }}>
          <StatCard
            label="Crates with vendors"
            value={`${data.crates_with_vendors} out`}
            topBorderColor={brand.mint}
          />
        </Box>
        <Box sx={{ minWidth: 210, flex: 1 }}>
          <StatCard
            label="Outstanding"
            value={formatCompactCurrency(data.outstanding_total)}
            hint={`${data.vendors_over_limit} over limit`}
            hintColor={brand.warning}
            topBorderColor={brand.warningEdge}
          />
        </Box>
      </Stack>

      <FinancialOverview />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <AggregatedDemandCard />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <NeedsAttentionCard data={data} />
        </Grid>
      </Grid>
    </Stack>
  );
}

function VendorDashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard<VendorDashboard>(),
  });
  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
  });
  if (isLoading || !data) return <LoadingScreen />;

  return (
    <Stack spacing={2.5}>
      <Typography variant="h5" fontWeight={600}>
        Your milk supply at a glance
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card
            sx={{
              bgcolor: brand.ink,
              color: "#fff",
            }}
          >
            <CardContent>
              <Typography
                variant="caption"
                fontWeight={500}
                sx={{ opacity: 0.85 }}
              >
                Next delivery
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {data.next_delivery_summary ?? "None scheduled"}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {data.next_delivery_date
                  ? dayjs(data.next_delivery_date).format("D MMM YYYY")
                  : "—"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography
                variant="caption"
                fontWeight={500}
                color="text.secondary"
              >
                Account status
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {formatCompactCurrency(data.outstanding)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Credit available: {formatCompactCurrency(data.credit_available)}{" "}
                · Crates with you: {data.crates_with_vendor}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={600} sx={{ mb: 1.5 }}>
            Upcoming schedule
          </Typography>
          <Stack spacing={1}>
            {orders?.slice(0, 5).map((o) => (
              <Stack
                key={o.id}
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={500} fontSize={14}>
                    {o.order_no} · {o.total_quantity} pkt
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.delivery_date
                      ? dayjs(o.delivery_date).format("D MMM")
                      : o.recurrence_frequency}
                  </Typography>
                </Box>
                <StatusBadge status={o.status} />
              </Stack>
            ))}
            {!orders?.length && (
              <Typography variant="body2" color="text.secondary">
                No orders yet.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function DriverDashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard<DriverDashboard>(),
  });
  const { data: deliveries } = useQuery({
    queryKey: ["deliveries"],
    queryFn: listDeliveries,
  });
  if (isLoading || !data) return <LoadingScreen />;

  return (
    <Stack spacing={2.5}>
      <Typography variant="h5" fontWeight={600}>
        Today's route
      </Typography>
      <Grid container spacing={2}>
        <Grid size={4}>
          <StatCard label="Stops" value={data.stops_today} />
        </Grid>
        <Grid size={4}>
          <StatCard label="Packets loaded" value={data.packets_loaded} />
        </Grid>
        <Grid size={4}>
          <StatCard label="Crates issued" value={data.crates_issued} />
        </Grid>
      </Grid>
      <Stack spacing={1.5}>
        {deliveries?.map((d) => (
          <Card key={d.id} variant="outlined">
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={500}>{d.vendor_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {d.order_no} {d.truck_number ? `· ${d.truck_number}` : ""}
                </Typography>
              </Box>
              <StatusBadge status={d.status} />
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
