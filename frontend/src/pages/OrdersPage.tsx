import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Grid2 as Grid, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import { cancelOrder, listOrders } from "@/api/orders";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { useAuthStore } from "@/store/authStore";
import { usePermission } from "@/hooks/usePermissions";
import { useToastStore } from "@/store/uiStore";
import { extractErrorMessage } from "@/api/client";
import type { Order } from "@/types/models";

export function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const isVendor = user?.role === "vendor";
  const { can } = usePermission("orders");
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
  });

  const cancel = useMutation({
    mutationFn: cancelOrder,
    onSuccess: async () => {
      toast("Order cancelled");
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => toast(extractErrorMessage(error), "error"),
  });

  const stats = useMemo(
    () => ({
      scheduled: orders.filter((o) => o.status === "scheduled").length,
      recurring: orders.filter((o) => o.order_type === "recurring").length,
      locked: orders.filter((o) => o.status === "locked").length,
      draft: orders.filter((o) => o.status === "draft").length,
    }),
    [orders],
  );

  const columns: DataTableColumn<Order>[] = [
    {
      key: "order_no",
      header: "Order",
      sortValue: (o) => o.order_no,
      render: (o) => (
        <Typography
          fontFamily="'JetBrains Mono',monospace"
          fontWeight={500}
          color="primary.main"
          fontSize={13}
        >
          {o.order_no}
        </Typography>
      ),
    },
    ...(isVendor
      ? []
      : [
          {
            key: "vendor",
            header: "Vendor",
            sortValue: (o: Order) =>
              o.vendor_name ?? o.walkin_customer_name ?? "",
            render: (o: Order) => (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography fontWeight={500} fontSize={13}>
                  {o.vendor_name ?? o.walkin_customer_name}
                </Typography>
                {o.is_walkin && <StatusBadge status="draft" label="Walk-in" />}
              </Stack>
            ),
          } as DataTableColumn<Order>,
        ]),
    {
      key: "delivery",
      header: "Delivery",
      render: (o) =>
        o.delivery_date ? dayjs(o.delivery_date).format("D MMM") : "Recurring",
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      sortValue: (o) => o.total_quantity,
      render: (o) => `${o.total_quantity} pkt`,
    },
    {
      key: "type",
      header: "Type",
      render: (o) => <StatusBadge status={o.order_type} />,
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (o) =>
        can("full") && o.is_editable && o.status !== "cancelled" ? (
          <Button
            size="small"
            color="inherit"
            onClick={() => cancel.mutate(o.id)}
          >
            Cancel
          </Button>
        ) : null,
    },
  ];

  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {isVendor ? "My Orders" : "Demand Scheduling"}
          </Typography>
          <Typography color="text.secondary">
            {isVendor
              ? "Schedule future demand & edit before cut-off"
              : "Immediate, scheduled & recurring orders across all vendors"}
          </Typography>
        </Box>
        {can("full") && (
          <Button
            variant="contained"
            onClick={() => navigate("/orders/schedule")}
          >
            + {isVendor ? "Schedule order" : "New order"}
          </Button>
        )}
      </Stack>

      {!isVendor && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard label="Scheduled" value={stats.scheduled} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard label="Recurring" value={stats.recurring} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard label="Locked (past cut-off)" value={stats.locked} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard label="Draft" value={stats.draft} />
          </Grid>
        </Grid>
      )}

      <DataTable
        columns={columns}
        rows={orders}
        getRowId={(o) => o.id}
        emptyMessage={isLoading ? "Loading…" : "No orders yet"}
      />

      <Typography variant="caption" color="text.secondary">
        Cut-off rules: same-day blocked after 6 AM · next-day closes 9 PM ·
        scheduled orders editable until 1 day before delivery.
      </Typography>
    </Stack>
  );
}
