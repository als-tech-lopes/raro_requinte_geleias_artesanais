import { AdminShell } from "@/components/admin-shell";
import { ProductManager } from "@/components/products/product-manager";
import { AuthGate } from "@/components/auth/auth-gate";

export default function ProductsPage() {
  return <AuthGate><AdminShell><ProductManager /></AdminShell></AuthGate>;
}
