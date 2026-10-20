export type DashboardData = {
  revenue: number;
  salesCount: number;
  productsSold: number;
  productionsCount: number;
  lowStockCount: number;
  latestSales: Array<{ id: string; date: string; total: number; status: string; customer: string }>;
  lowStockProducts: Array<{ id: string; name: string; quantity: number }>;
  lowStockIngredients: Array<{ id: string; name: string; quantity: number; minimum: number; unit: string }>;
};
