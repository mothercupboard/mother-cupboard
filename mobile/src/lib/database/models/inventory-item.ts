import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export type ItemLocation = 'fridge' | 'freezer' | 'cupboard';
export type ExpiryType = 'use_by' | 'best_before';

export class InventoryItem extends Model {
  static table = 'inventory_items';

  @field('name') name!: string;
  @field('quantity') quantity!: number | null;
  @field('unit') unit!: string | null;
  @field('location') location!: ItemLocation;
  @field('expiry_date') expiryDate!: number | null; // unix ms or null
  @field('expiry_type') expiryType!: ExpiryType | null;
  @field('barcode') barcode!: string | null;
  @field('category') category!: string | null;
  @field('notes') notes!: string | null;
  @field('is_deleted') isDeleted!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
