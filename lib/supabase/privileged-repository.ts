/**
 * Privileged Repository Pattern
 * 
 * This module centralizes all service-role database operations to:
 * 1. Reduce direct service-role usage across the codebase
 * 2. Provide a clear audit trail of privileged operations
 * 3. Enable proper error handling and logging for sensitive operations
 * 4. Make it easier to identify and restrict privileged access
 * 
 * All privileged operations should go through this layer rather than
 * directly using createSupabaseAdminClient().
 */

import { createSupabaseAdminClient } from "./admin";

export type PrivilegedOperationResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  operation: string;
  timestamp: string;
};

/**
 * Base privileged repository class with common functionality
 */
export abstract class PrivilegedRepository {
  protected supabase = createSupabaseAdminClient();
  protected operationName: string;

  constructor(operationName: string) {
    this.operationName = operationName;
  }

  /**
   * Execute a privileged operation with logging and error handling
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>,
  ): Promise<PrivilegedOperationResult<T>> {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`[Privileged:${this.operationName}] Starting`, context);
      
      const result = await operation();
      
      console.log(`[Privileged:${this.operationName}] Completed successfully`, {
        ...context,
        result: typeof result === 'object' ? 'object' : result,
      });
      
      return {
        success: true,
        data: result,
        operation: this.operationName,
        timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Privileged:${this.operationName}] Failed`, {
        ...context,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
        operation: this.operationName,
        timestamp,
      };
    }
  }
}

/**
 * Order-related privileged operations
 */
export class OrderPrivilegedRepository extends PrivilegedRepository {
  constructor() {
    super('order');
  }

  /**
   * Update order status (privileged operation)
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    actor: { userId?: string; email?: string; role?: string },
  ): Promise<PrivilegedOperationResult<{ id: string; status: string }>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .select("id, status")
        .single();

      if (error) throw new Error(error.message);
      return data as { id: string; status: string };
    }, { orderId, status, actor });
  }

  /**
   * Update order payment status (privileged operation)
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: string,
    actor: { userId?: string; email?: string; role?: string },
  ): Promise<PrivilegedOperationResult<{ id: string; payment_status: string }>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from("orders")
        .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .select("id, payment_status")
        .single();

      if (error) throw new Error(error.message);
      return data as { id: string; payment_status: string };
    }, { orderId, paymentStatus, actor });
  }

  /**
   * Archive order instead of deleting (privileged operation)
   */
  async archiveOrder(
    orderId: string,
    reason: string,
    actor: { userId?: string; email?: string; role?: string },
  ): Promise<PrivilegedOperationResult<{ id: string; status: string }>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from("orders")
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select("id, status")
        .single();

      if (error) throw new Error(error.message);
      return data as { id: string; status: string };
    }, { orderId, reason, actor });
  }
}

/**
 * User-related privileged operations
 */
export class UserPrivilegedRepository extends PrivilegedRepository {
  constructor() {
    super('user');
  }

  /**
   * Update user role (privileged operation)
   */
  async updateUserRole(
    userId: string,
    role: string,
    actor: { userId?: string; email?: string; role?: string },
  ): Promise<PrivilegedOperationResult<{ id: string; role: string }>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from("users")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select("id, role")
        .single();

      if (error) throw new Error(error.message);
      return data as { id: string; role: string };
    }, { userId, role, actor });
  }

  /**
   * Update user points (privileged operation)
   */
  async updateUserPoints(
    userId: string,
    points: number,
    operation: 'add' | 'subtract' | 'set',
    actor: { userId?: string; email?: string; role?: string },
  ): Promise<PrivilegedOperationResult<{ id: string; points: number }>> {
    return this.execute(async () => {
      // For now, only support 'set' operation to avoid SQL complexity
      // Arithmetic operations can be added later with proper RPC functions
      if (operation !== 'set') {
        throw new Error('Only "set" operation is currently supported for updateUserPoints');
      }

      const { data, error } = await this.supabase
        .from("users")
        .update({ 
          points,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("id, points")
        .single();

      if (error) throw new Error(error.message);
      return data as { id: string; points: number };
    }, { userId, points, operation, actor });
  }

  /**
   * Delete user account (privileged operation - should be rare)
   */
  async deleteUser(
    userId: string,
    reason: string,
    actor: { userId?: string; email?: string; role?: string },
  ): Promise<PrivilegedOperationResult<{ id: string }>> {
    return this.execute(async () => {
      const { error } = await this.supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (error) throw new Error(error.message);
      return { id: userId };
    }, { userId, reason, actor });
  }
}

/**
 * Product-related privileged operations
 */
export class ProductPrivilegedRepository extends PrivilegedRepository {
  constructor() {
    super('product');
  }

  /**
   * Update product stock (privileged operation)
   */
  async updateStock(
    productId: string,
    stockChange: number,
    operation: 'add' | 'subtract' | 'set',
    actor: { userId?: string; email?: string; role?: string },
  ): Promise<PrivilegedOperationResult<{ id: string; stock: number }>> {
    return this.execute(async () => {
      // First get current stock
      const { data: current } = await this.supabase
        .from("products")
        .select("stock")
        .eq("id", productId)
        .single();

      if (!current) {
        throw new Error("Product not found");
      }

      const currentStock = (current as { stock: number }).stock ?? 0;
      const newStock = operation === 'set' 
        ? stockChange
        : operation === 'add'
        ? currentStock + stockChange
        : currentStock - stockChange;

      const { data, error } = await this.supabase
        .from("products")
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .select("id, stock")
        .single();

      if (error) throw new Error(error.message);
      return data as { id: string; stock: number };
    }, { productId, stockChange, operation, actor });
  }

  /**
   * Update product price (privileged operation)
   */
  async updatePrice(
    productId: string,
    priceEgp: number,
    actor: { userId?: string; email?: string; role?: string },
  ): Promise<PrivilegedOperationResult<{ id: string; price_egp: number }>> {
    return this.execute(async () => {
      const { data, error } = await this.supabase
        .from("products")
        .update({ 
          price_egp: priceEgp,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .select("id, price_egp")
        .single();

      if (error) throw new Error(error.message);
      return data as { id: string; price_egp: number };
    }, { productId, priceEgp, actor });
  }
}

/**
 * Singleton instances for common repositories
 */
export const orderPrivilegedRepo = new OrderPrivilegedRepository();
export const userPrivilegedRepo = new UserPrivilegedRepository();
export const productPrivilegedRepo = new ProductPrivilegedRepository();
